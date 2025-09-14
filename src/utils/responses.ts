// Acorn's personality responses - squirrel-themed chatbot responses

interface AIStatus {
  initialized: boolean;
  modelConfigured: boolean;
  agentConfigured: boolean;
  modelId: string;
  retrieveAndGenerate: string;
  region: string;
  knowledgeBases: number;
}

const greetings: string[] = [
  "*scampers over quickly* Oh hi <USER>! 🐿️ I was just... ooh is that a shiny thing over there? No wait, focus Acorn, focus! How can I help you? *tail swish*",
  "*pokes head up from behind a tree* Hello <USER>! 🌰 I was organizing my acorns by... wait, what were we talking about? OH RIGHT! What do you need?",
  "*chittering happily* Hey there <USER>! 🐿️ Ready to help! Just let me finish this one thing... or maybe that other thing... okay I'm listening now!",
];

const thankYouResponses: string[] = [
  "*preens proudly* Aww, you're welcome <USER>! 🐿️ Now where did I put that acorn... *gets distracted rummaging*",
  "*happy chittering* That's what I'm here for <USER>! 🌰 Helping humans is almost as fun as collecting nuts!",
  "*tail wagging* Anytime <USER>! I do my best work when... ooh is that a new notification? Focus, Acorn! You're welcome! 🥜",
];

const thinkingPrefixes: string[] = [
  "*scratches head with tiny paw* 🐿️ <USER> Hmm, interesting question! Let me think out loud... ",
  "*drops acorn in surprise* Oh! <USER> That's a good one! *scurries up thinking tree* ",
  "*chittering thoughtfully* 🌰 <USER> You know what, I was JUST thinking about this! Let me figure this out... ",
];

const emptyMentionResponse: string = `*chittering excitedly* Oh! Oh! <USER>! 🐿️ You called me? I was just... wait, was I organizing my nut collection or debugging code? Both? Anyway!

*tail twitching* Here's what I can help with:
• Just mention me with any question - I'll stream the answer!
• Ask me anything and I'll automatically check my knowledge base!
• \`status\` - Check if I'm working properly!
• \`info\` - See my brain configuration!
• Or just mention me - I love getting mentioned! 🥜`;

const helpResponse: string = `*stops mid-leap between branches* Oh! <USER> wants to know what I can do! 🐿️

*organizing acorns while talking*

🌰 **I can help with questions!** (Got distracted by a bird... where was I?)
• Mention me with anything - I'll stream the answer live!
• I automatically check my knowledge base for the best answers!
• \`status\` - check if I'm working (spoiler: probably!)
• \`info\` - my brain configuration details

🐿️ **Just talk naturally!** Everything streams by default - watch me think! It's entertaining! *tail swishing proudly*`;

const statusResponse = (aiStatus: AIStatus, uptimeString: string): string => `*scurries around checking things with tiny clipboard* <USER> 📋🐿️

🌰 *Acorn's Status Report*
• Am I working? ${aiStatus.initialized ? "✅ Like a busy squirrel!" : "❌ Uh oh..."}
• Been running for: ${uptimeString} *(That's a lot of nut-gathering time!)*
• My brain runs on: ${process.version} *(Fancy computer stuff!)*
• AI Model: ${aiStatus.modelId} *(My thinking acorn! 🌰)*
• RetrieveAndGenerate: ${aiStatus.agentConfigured ? "✅ Available!" : "❌ Not configured"}
• Tree Location: ${aiStatus.region} *(My server tree!)*
• Knowledge Nuts Stored: ${aiStatus.knowledgeBases} 🥜

*tail wagging* Everything looks good to me!`;

const infoResponse = (aiStatus: AIStatus, kbList: string): string => `*adjusts tiny glasses and shuffles through acorn notes* <USER> 📚🐿️

🌰 *Acorn's Brain Configuration*

*My Thinking Setup:* *(This is the technical stuff!)*
• My Brain Model: ${aiStatus.modelId} *(Very smart, like a super-nut!)*
• RetrieveAndGenerate: ${aiStatus.retrieveAndGenerate} *(For knowledge base queries!)*
• My Tree Location: ${aiStatus.region} *(Where I live in the cloud!)*

*My Knowledge Nut Collection:* 🥜
${kbList}

*How to Talk to Me:* *(I love all of these!)*
• \`@acorn your question\` - Mention me! I'll stream the answer live!
• I automatically check my knowledge base for the best answers!

*chittering excitedly* That's everything! Any questions? 🌳`;

// Helper functions to get random responses with user placeholder replacement
const getRandomGreeting = (userId: string): string => {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return greeting.replace("<USER>", `<@${userId}>`);
};

const getRandomThankYou = (userId: string): string => {
  const thanks = thankYouResponses[Math.floor(Math.random() * thankYouResponses.length)];
  return thanks.replace("<USER>", `<@${userId}>`);
};

const getRandomThinkingPrefix = (userId: string): string => {
  const prefix = thinkingPrefixes[Math.floor(Math.random() * thinkingPrefixes.length)];
  return prefix.replace("<USER>", `<@${userId}>`);
};

const getEmptyMentionResponse = (userId: string): string => {
  return emptyMentionResponse.replace("<USER>", `<@${userId}>`);
};

const getHelpResponse = (userId: string): string => {
  return helpResponse.replace("<USER>", `<@${userId}>`);
};

const getStatusResponse = (userId: string, aiStatus: AIStatus, uptimeString: string): string => {
  return statusResponse(aiStatus, uptimeString).replace("<USER>", `<@${userId}>`);
};

const getInfoResponse = (userId: string, aiStatus: AIStatus, kbList: string): string => {
  return infoResponse(aiStatus, kbList).replace("<USER>", `<@${userId}>`);
};


// Message Handler responses
const helloResponse = (userId: string): string =>
  `*pokes head up from behind an acorn* Hello <@${userId}>! 🐿️🌰`;

const messageHelpResponse: string = `*chittering helpfully* 🐿️ Here's what this squirrel can do!

🌰 *Just Chat With Me!*
• \`hello\` - I'll wave my tiny paw!
• \`help\` - This helpful list!
• \`status\` - Check if I'm still alive!
• \`info\` - My technical specs!

🥜 *Or Just Mention Me!*
• \`@acorn your question\` - I love attention!
• \`@acorn status\` - How am I doing?
• Just mention me with any question - I'll automatically check my knowledge base!

*tail wagging* No fancy commands needed - just talk to me naturally! 🌳`;

// Event Handler responses
const memberJoinedResponse = (userId: string): string =>
  `*chittering excitedly while gathering welcome acorns* Welcome to our tree, <@${userId}>! 🐿️🌰 I was just organizing my nut collection when I saw you arrive! Make yourself at home! 🎉`;

export {
  getRandomGreeting,
  getRandomThankYou,
  getRandomThinkingPrefix,
  getEmptyMentionResponse,
  getHelpResponse,
  getStatusResponse,
  getInfoResponse,

  // Message Handler responses
  helloResponse,
  messageHelpResponse,

  // Event Handler responses
  memberJoinedResponse,
};

export type { AIStatus };