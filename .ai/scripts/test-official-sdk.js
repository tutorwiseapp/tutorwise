#!/usr/bin/env node
/**
 * Test using the official Gemini API method from docs
 */

const env = require('../../tools/scripts/utilities/load-env.js');

// Set the environment variable as expected by the official SDK
process.env.GEMINI_API_KEY = env.getGeminiKey();

console.log('🔍 Testing with official Gemini API approach...');
console.log('API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');

async function testOfficialSDK() {
    try {
        // Check if we have the official SDK
        const { GoogleGenAI } = require('@google/genai');

        console.log('✅ Official SDK found');

        // Initialize as per docs
        const ai = new GoogleGenAI({});

        console.log('📝 Making request...');
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say hello in one word",
            config: {
                thinkingConfig: {
                    thinkingBudget: 0, // Disable thinking for speed
                },
            }
        });

        console.log('✅ SUCCESS:', response.text);

    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log('❌ Official SDK not installed');
            console.log('💡 Need to run: npm install @google/genai');
            return false;
        } else {
            console.log('❌ Error:', error.message);
            if (error.message.includes('429')) {
                console.log('💡 Still quota issue - API key needs proper billing');
            }
            return false;
        }
    }

    return true;
}

testOfficialSDK();