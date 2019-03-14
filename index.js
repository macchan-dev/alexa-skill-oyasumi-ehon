// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const Util = require('util.js');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

// ログ出力
const log = (msg) => {
    console.log(`[Oyasumi] ${JSON.stringify(msg)}`);
}

// 再生位置の取得
const getOffset = (handlerInput) => {
    let offset = 0;
    // 一時停止後に再開したときに止めたところ位置が分かります。
    const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
    if (audioPlayer) {
        offset = audioPlayer.offsetInMilliseconds;
    }
    log(`offset=${offset}`);
    return offset;
};

// 音楽ファイルの再生
const getPlayResponse = (handlerInput, offset) => {
    const url = Util.getS3PreSignedUrl('Media/oyasumi_ehon.mp3');
    
    const token = 'oyasumi_ehon';
    log(`token=${token}`);
    return handlerInput.responseBuilder
        .addAudioPlayerPlayDirective('REPLACE_ALL', url, token, offset, null)
        .getResponse();
};

// 停止
const getStopResponse = (handlerInput) => {
    return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse();
};

// 永続アトリビュート。再生位置の取得。
const getPersistentOffset = async (handlerInput) => {
    const attributesManager = handlerInput.attributesManager;
    const attr = await attributesManager.getPersistentAttributes();
    return attr.offset;
};

// 永続アトリビュート。再生位置の保存。
const savePersistentOffset = async (handlerInput, offset) => {
    const attributesManager = handlerInput.attributesManager;
    const attr = await attributesManager.getPersistentAttributes();
    attr.offset = offset;
    attributesManager.setPersistentAttributes(attr);
    await attributesManager.savePersistentAttributes();
};

// 起動時のイベント
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.type);
        
        const offset = await getPersistentOffset(handlerInput);
        log(`Launch offset=${offset}`);
        
        if (offset === undefined || offset === 0) {
            // 取れなければ最初から。
            return getPlayResponse(handlerInput, 0);
        } else {
            const speechText = '途中から再生させますか？';
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(speechText)
                .getResponse();
        }
    }
};
// サンプル発話で起動した時のイベント
const PlayOyasumiEhonIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'PlayOyasumiEhonIntent';
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        return getPlayResponse(handlerInput, 0);
    }
};
// ヘルプを呼んだときのイベント
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'お休み絵本を起動して、再生してと言ってください。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
// ストップ、キャンセルと呼ばれたときのイベント
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        return getStopResponse(handlerInput);
    }
};
// 終了したときのイベント
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};
// AudioPlayerリクエスト
const AudioPlayerRequestIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackStarted'
            || handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackNearlyFinished'
            || handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackStopped'
            || handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackFinished';
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.type);
        return handlerInput.responseBuilder
            .getResponse();
    }
};

// 一時停止のときに呼ばれるイベント
const PauseIntentHandler = {
	canHandle(handlerInput) {
	    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PauseIntent';
    },
    async handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        const offset = getOffset(handlerInput);
        await savePersistentOffset(handlerInput, offset);
        
        return getStopResponse(handlerInput);
    },
};

// 再開したときに呼ばれるイベント
const ResumeIntentHandler = {
    canHandle(handlerInput) {
	    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.ResumeIntent';
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        let offset = getOffset(handlerInput);
        
        return getPlayResponse(handlerInput, offset);
    },
};

// はい。と言った時に呼ばれるイベント
const YesIntentHandler = {
    canHandle(handlerInput) {
	    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    async handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        const offset = await getPersistentOffset(handlerInput);
        
        return getPlayResponse(handlerInput, offset);
    },
};

// いいえ。と言った時に呼ばれるイベント
const NoIntentHandler = {
    canHandle(handlerInput) {
	    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {
        log(handlerInput.requestEnvelope.request.intent.name);
        
        return getPlayResponse(handlerInput, 0);
    },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `${intentName}が呼ばれました。`;
        console.log(speechText);

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        log(handlerInput.requestEnvelope.request.type);
        const speechText = `すみません。分かりません。`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PlayOyasumiEhonIntentHandler,
        AudioPlayerRequestIntent,
        PauseIntentHandler,
        ResumeIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter(
            {bucketName:process.env.S3_PERSISTENCE_BUCKET}))
    .lambda();
