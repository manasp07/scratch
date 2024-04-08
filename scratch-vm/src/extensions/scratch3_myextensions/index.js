const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const API_KEY="AIzaSyDM7UDr72RpB91F5ARaxrNWvQKXqWQ1fZA"
const genAI = new GoogleGenerativeAI(API_KEY);

async function generateStory(prompt) {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();
  return text;
}

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const log = require('../../util/log');

class myextensions {
    constructor(runtime) {
        this.runtime = runtime;
    }

    getInfo() {
        return {
            id: 'myextensions',
            name: 'My Extension',
            blocks: [{
                opcode: 'writeText',
                blockType: BlockType.REPORTER,
                text: 'myText [TEXT]',
                arguments: {
                    TEXT: {
                        type: ArgumentType.STRING,
                        defaultValue: "Type text"
                    }
                }
            }],
            menus: {}
        };
    }

    async writeText(args) {
        const text = Cast.toString(args.TEXT);
        const generatedStory = await generateStory(text);
        console.log(generatedStory);
       return generatedStory;
    }
}


module.exports = myextensions;
