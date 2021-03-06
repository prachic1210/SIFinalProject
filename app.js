const express = require('express');
const app = express();
//portNumber
const port = 3000;
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
//validation and documentation
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

//Key AND Endpoint for translator API
let key = process.env.API_KEY;

//text endpoint
var endpoint = "https://api.cognitive.microsofttranslator.com/";
//document endpoint
let endpoint2 = "https://instancefortextdocumenttranslation.cognitiveservices.azure.com/translator/text/batch/v1.0";


//swagger options
const options = {
    swaggerDefinition: {
        info: {
            title: 'Translator API',
            version: '1.0.0',
            description: 'Translator API documentation autogenerated by swagger'
        },
        host: '143.198.115.87:3000',
        basePath: '/',
    },
    apis: ['./app.js'],
};

// Add your location, also known as region. The default is global.
// This is required if using a Cognitive Services resource.
var location = "global";



const specs = swaggerJsdoc(options);

app.use(bodyParser.json());
//swagger documentation specified
app.use('/docs', swaggerUi.serve, swaggerUi.setup((specs)));
// enable cors for the application
app.use(cors());
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({     
    extended: true
}));

//source and target container for storing documents
/*Source container: inputdocs - stores all the documents that needs to be translated
  Target container: translateddocs - translated documents are stored here
*/
let data = JSON.stringify({
    "inputs": [
        {
            "source": {
                "sourceUrl": "https://analyticsforstorage.blob.core.windows.net/inputdocs?sp=rl&st=2022-05-01T03:33:28Z&se=2022-05-20T11:33:28Z&spr=https&sv=2020-08-04&sr=c&sig=Ua4MtfXFJST2orh7iHASypDV0EhqebTLcwwIlQcNbZo%3D",
                "storageSource": "AzureBlob",
                "language": "en",
                // "filter": {
                //     "prefix": "Demo_1/"
                // }
            },
            "targets": [
                {
                    "targetUrl": "https://analyticsforstorage.blob.core.windows.net/translateddocs?sp=wl&st=2022-05-01T03:37:10Z&se=2022-05-13T11:37:10Z&spr=https&sv=2020-08-04&sr=c&sig=l%2FRSSeBTGI2kww%2F8m7jXnOjaEC8lYicdpoZOfoftHB8%3D",
                    "storageSource": "AzureBlob",
                    // "category": "general",
                    "language": "fr"
                }]
        }]
});

/**
* @swagger
*
* definitions:
*   translationArray:
*     type: array
*     required:
*       - txt
*       - code
*     properties:
*       txt:
*         type: string
*       code:
*         type: array
*         items:
*             type: string
*   translationWithAllFields:
*     type: array
*     required:
*       - txt
*       - code
*       - fromLang
*     properties:
*       txt:
*         type: string
*       code:
*         type: array
*         items:
*             type: string
*       fromLang:
*         type: string
*   onlyTextArray:
*     type: array
*     required:
*       - txt
*     properties:
*       txt:
*         type: string
*   TransliterateArray:
*     type: array
*     required:
*       - txt
*       - code
*       - fromLang
*     properties:
*       txt:
*         type: string
*       code:
*         type: array
*         items:
*             type: string
*       toScript:
*         type: string
*       fromScript:
*         type: string
*   translationExample:
*     type: array
*     required:
*       - txt
*       - code
*       - translation
*     properties:
*       txt:
*         type: string
*       code:
*         type: array
*         items:
*             type: string
*       translation:
*          type: string
*/

//home api
app.get('/', (req, res) => {
    res.send("API Gateway using MS Azure translator API");
})

/**
* @swagger
* /translatetxtByCode:
*  post:
*   description: Returns text translated in the given language code array
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: text that needs to be translated,code of language in which the text needs to be translate and language code of the text that needs to be translated
*      required: true
*      schema:
*             $ref: '#/definitions/translationWithAllFields'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/translatetxtByCode',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters'),
    body('fromLang').trim().not().isEmpty().withMessage('fromLang cannot be empty').isLength({ min: 1 }).withMessage('fromLang must Be at Least 1 Characters').escape()
] ,async function (req, res) {
    let txt = req.body.txt;
    console.log("length   "+ req.body.code)
    let lanuageCode = req.body.code;
    let fromLang = req.body.fromLang;
    let api_url = '/translate';
    const errors = validationResult(req);
       if(!errors.isEmpty()){
            return  res.status(400).json({
                    'error': errors.array()
            })
       }

    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': fromLang,
            'to': lanuageCode
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('Translated successfully text by language code'+ JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });
});

/**
* @swagger
* /documentTranslate:
*  post:
*   description: Returns the translated documents response and stores documents in the target container specified.
*   produces:
*      - application/json
*   parameters: []
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/documentTranslate', async function (req, res) {
    let route = '/batches';
    axios({
        method: 'post',
        baseURL: endpoint2,
        url: route,
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/json'
        },
        data: data
    })
    .then(function (response) {
        let result = { statusText: response.statusText, statusCode: response.status, headers: response.headers };
        console.log()
        console.log(JSON.stringify(result));
        res.send('Documents translated successfully and stored in the traslateddocs blob container');
      })
      .catch(function (error) {
        res.status(500).json({
            'error': error
        });
      });

});


/**
* @swagger
* /translatefrmEng:
*  post:
*   description: Returns text from english translated in the given language code
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/translationArray'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/translatefrmEng',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').trim().not().isEmpty().withMessage('Language code name cannot be empty').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters').escape()
]   , async function (req, res) {
    let txt = req.body.txt;
    let lanuageCode = req.body.code;
    let fromLang = "en";
    let api_url = "/translate";
    const errors = validationResult(req);
       if(!errors.isEmpty()){
            return  res.status(400).json({
                    'error': errors.array()
            })
       }
    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': fromLang,
            'to': lanuageCode
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('Translated successfully from english language. '+JSON.stringify(response.data));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });

});


/**
* @swagger
* /detectAndTranslate:
*  post:
*   description: Returns text translated in the specified code parameter for language after automatically detecting the language of the text
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/translationArray'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/detectAndTranslate',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').trim().not().isEmpty().withMessage('Language code name cannot be empty').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters').escape()
], async function (req, res) {
    let txt = req.body.txt;
    let lanuageCode = req.body.code;
    let api_url = '/translate';
    const errors = validationResult(req);
       if(!errors.isEmpty()){
            return  res.status(400).json({
                    'error': errors.array()
            })
       }
    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'to': lanuageCode
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('detected and translated to'+ lanuageCode+' ' + JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });
});

/**
* @swagger
* /detectLanguage:
*  post:
*   description: Returns language detected, confidence score of the language detected (closer to 1.0 means strongly confident), is translation and transliteration supported as well.
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/onlyTextArray'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/detectLanguage',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape()
], async function (req, res) {
    let txt = req.body.txt;
    let api_url = '/detect';
    const errors = validationResult(req);
       if(!errors.isEmpty()){
            return  res.status(400).json({
                    'error': errors.array()
            })
       }

    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0'
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('Detected language successfully with translation. ' + JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });
});


/**
* @swagger
* /onlyTransliterate:
*  post:
*   description: Returns the script and output text.
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/TransliterateArray'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/onlyTransliterate',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').trim().not().isEmpty().withMessage('Language code name cannot be empty').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters').escape(),
    body('toScript').trim().not().isEmpty().withMessage('toScript cannot be empty').isLength({ min: 1 }).withMessage('toScript must Be at Least 1 Characters').escape(),
    body('fromScript').trim().not().isEmpty().withMessage('fromScript cannot be empty').isLength({ min: 1 }).withMessage('fromScript must Be at Least 1 Characters').escape()
], async function (req, res) {
    let txt = req.body.txt;
    let toScript = req.body.toScript;
    let lanuageCode = req.body.code;
    let fromScript = req.body.fromScript;
    let api_url = '/transliterate';
    const errors = validationResult(req);
       if(!errors.isEmpty()){
            return  res.status(400).json({
                    'error': errors.array()
            })
       }
    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'language': lanuageCode,
            'fromScript': fromScript,
            'toScript': toScript
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('Transliterated successfully '+JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });
});


/**
* @swagger
* /sentenceLength:
*  post:
*   description: Returns the charcacter count from the text given in request body.
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/onlyTextArray'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/sentenceLength',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape()
], async function (req, res) {
    let txt = req.body.txt;
    let api_url = '/breaksentence';

    const errors = validationResult(req);
    if(!errors.isEmpty()){
         return  res.status(400).json({
                 'error': errors.array()
         })
    }

    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0'
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('The sentence length for the text is'+JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });
});


/**
* @swagger
* /searchdictionary:
*  post:
*   description: Returns the list of various translations including confidence score, optimized text for display, part of speech(post tag) and information about previous translation .
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/translationWithAllFields'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/searchdictionary',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').trim().not().isEmpty().withMessage('Language code name cannot be empty').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters').escape(),
    body('fromLang').trim().not().isEmpty().withMessage('fromLang cannot be empty').isLength({ min: 1 }).withMessage('fromLang must Be at Least 1 Characters').escape()
],  async function (req, res) {
    let txt = req.body.txt;
    let code = req.body.code;
    let fromLang = req.body.fromLang;
    let api_url = '/dictionary/lookup';
    const errors = validationResult(req);
    if(!errors.isEmpty()){
         return  res.status(400).json({
                 'error': errors.array()
         })
    }

    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': fromLang,
            'to': code
        },
        data: [{
            'text': txt
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log(JSON.stringify(response.data, null, 4));
            res.send('Successfully searched dictionary with following results: '+JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });

});

/**
* @swagger
* /getExamples:
*  post:
*   description: Returns the list of translations including confidence score, optimized text for display, part of speech(post tag) and information about previous translation .
*   produces:
*      - application/json
*   parameters:
*    - name: body
*      in: body
*      description: enter a text in English that should be given to the azure translator api and language codes in which it needs to translated
*      required: true
*      schema:
*             $ref: '#/definitions/translationExample'
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.post('/getExamples',[
    body('txt').trim().not().isEmpty().withMessage('txt name cannot be empty').isLength({ min: 1 }).withMessage('Text Must Be at Least 1 Characters').escape(),
    body('code').trim().not().isEmpty().withMessage('Language code name cannot be empty').isLength({ min: 1 }).withMessage('LanguageCode must Be at Least 1 Characters').escape(),
    body('fromLang').trim().not().isEmpty().withMessage('fromLang cannot be empty').isLength({ min: 1 }).withMessage('fromLang must Be at Least 1 Characters').escape(),
    body('translation').trim().not().isEmpty().withMessage('translation text cannot be empty').isLength({ min: 1 }).withMessage('translation text must Be at Least 1 Characters').escape()
], async function (req, res) {
    let txt = req.body.txt;
    let code = req.body.code;
    let fromLang = req.body.fromLang;
    let translation = req.body.translation;
    let api_url = '/dictionary/examples';

    const errors = validationResult(req);
    if(!errors.isEmpty()){
         return  res.status(400).json({
                 'error': errors.array()
         })
    }

    axios({
        baseURL: endpoint,
        url: api_url,
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': fromLang,
            'to': code
        },
        data: [{
            'text': txt,
            'translation': translation
        }],
        responseType: 'json'
    })
        .then((response) => {
            console.log('Retrieved examples for the text successfully' + JSON.stringify(response.data, null, 4));
            res.send('Retrieved examples for the text successfully' + JSON.stringify(response.data, null, 4));
        })
        .catch(function (error) {
            res.status(500).json({
                'error': error
            });
          });

});



/**
* @swagger
* /getDocumentFormats:
*  get:
*   description: Returns the the status of a specific document in a Document Translation request .
*   produces:
*      - application/json
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.get('/getDocumentFormats', async function (req, res) {
    let route = '/documents/formats';
    axios({
        method: 'get',
        url: endpoint + route,
        headers: {
          'Ocp-Apim-Subscription-Key': key
        }
    })
    .then(function (response) {
        console.log(JSON.stringify(response.data));
        res.send("Document formats"+ JSON.stringify(response.data));
      })
      .catch(function (error) {
        res.status(500).json({
            'error': error
        });
      });
});


/**
* @swagger
* /getJobStatus:
*  get:
*   description: Returns the the status of a specific document in a Document Translation request .
*   produces:
*      - application/json
*   responses:
*      200:
*        description: Successfully response returned
*      500:
*        description: Internal Error
*/
app.get('/getJobStatus', async function (req, res) {
    let route = '/batches/{id}';
    axios({
        method: 'get',
        url: endpoint + route,
        headers: {
            'Ocp-Apim-Subscription-Key': key
        }
    })
    .then(function (response) {
        console.log(JSON.stringify(response.data));
        res.send("Document translation job status successfully is: "+ JSON.stringify(response.data));
      })
      .catch(function (error) {
        res.status(500).json({
            'error': error
        });
      });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})