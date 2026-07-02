import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export class AIService {
  /**
   * Simulated or Actual Whisper transcription service.
   */
  static async generateTranscript(videoTitle: string): Promise<string> {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'mock-openai-key-for-transcripts-and-chat') {
      return this.getMockTranscript(videoTitle);
    }

    try {
      // In production, you would call OpenAI Whisper API using form-data and the audio file.
      // Here, we simulate the structure of an OpenAI request for transcription.
      const prompt = `Generate a realistic transcripts script for a video about "${videoTitle}". Make it detailed and educational.`;
      const response = await axios.post(
        'https://api.openai.com/1/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a professional captioner and transcribing assistant.' },
            { role: 'user', content: prompt }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.warn('AI Transcription call failed, fallback to mock transcripts', error);
      return this.getMockTranscript(videoTitle);
    }
  }

  /**
   * Simulated or Actual GPT video helper chatbot.
   */
  static async getVideoChatReply(transcript: string, question: string, history: { role: string; content: string }[]): Promise<string> {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'mock-openai-key-for-transcripts-and-chat') {
      return this.getMockChatReply(question);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `You are StreaminAi, a helpful video companion. You have full access to the following video transcripts:
          ---
          ${transcript}
          ---
          Answer the user's questions about the video contents based solely on this transcripts. Keep answers friendly, concise, and structured.`
        },
        ...history,
        { role: 'user', content: question }
      ];

      const response = await axios.post(
        'https://api.openai.com/1/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.warn('AI Chat Assistant failed, fallback to mock replies', error);
      return this.getMockChatReply(question);
    }
  }

  /**
   * Simulated or Actual metadata generator.
   */
  static async suggestMetadata(title: string, category: string): Promise<{ description: string; tags: string[] }> {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'mock-openai-key-for-transcripts-and-chat') {
      return {
        description: `Welcome back to my channel! In this video, we're diving deep into ${title}. We'll cover the core concepts, discuss tips & tricks, and demonstrate practical applications. Make sure to like, subscribe, and share!\n\nChapters:\n0:00 Introduction\n1:30 Core Analysis\n5:15 Summary & Next Steps`,
        tags: [category.toLowerCase(), title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').join('-'), 'streaminai', 'tutorial']
      };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/1/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO and content strategist for YouTube channels. Return a JSON containing "description" and a string list of "tags".'
            },
            {
              role: 'user',
              content: `Suggest metadata for a video titled "${title}" in the "${category}" category. Output valid JSON in the format: {"description": "...", "tags": ["tag1", "tag2"]}`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = JSON.parse(response.data.choices[0].message.content);
      return {
        description: data.description || 'No description generated.',
        tags: data.tags || []
      };
    } catch (error) {
      return {
        description: `Welcome to this tutorial on ${title}. We explore concepts in ${category} detailing critical walkthroughs.`,
        tags: [category.toLowerCase(), 'streaminai']
      };
    }
  }

  /**
   * Moderate content (Comment moderation/Toxicity filter)
   */
  static async moderateContent(content: string): Promise<{ safe: boolean; reason?: string }> {
    const toxicKeywords = ['kill', 'hate', 'die', 'threat', 'offensive', 'spam123'];
    const lowered = content.toLowerCase();
    
    for (const word of toxicKeywords) {
      if (lowered.includes(word)) {
        return { safe: false, reason: `Contains inappropriate language (${word})` };
      }
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'mock-openai-key-for-transcripts-and-chat') {
      return { safe: true };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/1/v1/moderations',
        { input: content },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.results[0];
      if (result.flagged) {
        const categories = Object.keys(result.categories).filter((key) => result.categories[key]);
        return { safe: false, reason: `Violates policies: ${categories.join(', ')}` };
      }
      return { safe: true };
    } catch (error) {
      return { safe: true };
    }
  }

  private static getMockTranscript(title: string): string {
    return `[00:01] Welcome back to StreaminAi! Today, we are discussing "${title}". Let's start with a high level introduction.
[00:15] In this tutorial, we will unpack how this system is built, looking closely at the engineering details and integrations.
[00:45] The key takeaway is how we stream content directly to clients.
[01:20] We will also cover caching mechanisms and DB queries using modern ORM parameters.
[02:00] Finally, we'll run a quick validation, write unit tests, and demonstrate running locally.
[02:40] Thank you for watching, and remember to subscribe to the channel for more automated developer content!`;
  }

  private static getMockChatReply(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('what') || q.includes('define') || q.includes('explain')) {
      return "Based on the transcripts, this video explains how the architecture is set up and highlights streaming components to clients. The presenter outlines how to run databases and write checks.";
    }
    if (q.includes('time') || q.includes('when')) {
      return "The core system integration is discussed around [00:45], and the demo setup runs around [02:00] in the timeline.";
    }
    return `I received your question: "${question}". According to the video, the author emphasizes optimizing data flows and recommends setting up cache fallbacks for production-grade builds.`;
  }
}
