/*
 * Kitchen Inbox - an Alexa skill that adds whatever you say to a Google Sheet.
 *
 * "Alexa, ask Kitchen Box to add oat milk" -> new row in the Kitchen Inbox sheet.
 * The sheet's Apps Script web app does the actual writing; Muse reads the sheet
 * each morning and works through the "new" rows.
 */

const Alexa = require('ask-sdk-core');
const https = require('https');
const { URL } = require('url');

// ---------- Settings ----------
const WEBAPP_URL = '__WEBAPP_URL__';   // Apps Script web app (Deploy -> Web app URL)
const TOKEN = '__TOKEN__';  // must match TOKEN in the Apps Script
// ------------------------------

// POST to the web app. Apps Script answers with a redirect to the result, so follow it with a GET.
function request(urlString, method, body, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          resolve(request(res.headers.location, 'GET', null, redirectsLeft - 1));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Sheet web app returned ${res.statusCode}: ${text.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Unexpected reply from sheet web app: ${text.slice(0, 200)}`));
        }
      });
    });
    req.setTimeout(6000, () => req.destroy(new Error('Sheet web app timed out')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function addToSheet(item) {
  const result = await request(WEBAPP_URL, 'POST', { token: TOKEN, item });
  if (!result || !result.ok) throw new Error(`Sheet web app refused the item: ${JSON.stringify(result)}`);
}

// ---------- Handlers ----------

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Kitchen Inbox. What should I add? Start with the word add, like: add oat milk.')
      .reprompt('Say add, then the item. For example: add oat milk.')
      .getResponse();
  },
};

const AddItemIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddItemIntent';
  },
  async handle(handlerInput) {
    const item = (Alexa.getSlotValue(handlerInput.requestEnvelope, 'item') || '').trim();
    const oneShot = handlerInput.requestEnvelope.session && handlerInput.requestEnvelope.session.new;

    if (!item) {
      return handlerInput.responseBuilder
        .speak("Sorry, I didn't catch that. Say add, then the item.")
        .reprompt('Say add, then the item.')
        .getResponse();
    }

    await addToSheet(item);

    if (oneShot) {
      return handlerInput.responseBuilder.speak(`Added ${item}.`).withShouldEndSession(true).getResponse();
    }
    return handlerInput.responseBuilder
      .speak(`Added ${item}. Anything else?`)
      .reprompt('Anything else? Say add, then the item, or say no.')
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('I add things to the Kitchen Inbox sheet. Say add, then anything: like add dish soap, or add book the dentist. What should I add?')
      .reprompt('Say add, then the item.')
      .getResponse();
  },
};

const DoneIntentHandler = {
  canHandle(handlerInput) {
    if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') return false;
    const name = Alexa.getIntentName(handlerInput.requestEnvelope);
    return ['AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent', 'AMAZON.NavigateHomeIntent'].includes(name);
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Okay.').withShouldEndSession(true).getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Start with the word add. For example: add oat milk.')
      .reprompt('Say add, then the item.')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error: ${error.stack || error}`);
    return handlerInput.responseBuilder
      .speak("Sorry, I couldn't reach the Kitchen Inbox sheet. Please try again.")
      .withShouldEndSession(true)
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AddItemIntentHandler,
    HelpIntentHandler,
    DoneIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
