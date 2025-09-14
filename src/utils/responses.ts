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
• \`ask: your question\` - I'll find the answer! Eventually!
• \`ask kb1: question\` - I'll search my special nut storage!
• \`/acorn-ask question\` - Ooh, fancy slash commands!
• Or just mention me - I love getting mentioned! 🥜`;

const helpResponse: string = `*stops mid-leap between branches* Oh! <USER> wants to know what I can do! 🐿️

*organizing acorns while talking*

🌰 **I can help with questions!** (Got distracted by a bird... where was I?)
• Mention me with anything - I'll stream the answer live!
• \`ask: question\` - for when you want answers (also streams!)
• \`ask kb1: question\` - I know where the good nuts... I mean knowledge is stored!
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
• \`ask: your question\` - Just ask me anything!
• \`ask kb1: question\` - I'll check my special nut storage!
• \`@acorn your question\` - Mention me! I'll stream the answer live!

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

// AI Handler responses
const askEmptyResponse: string = "*tilts head* You said \"ask:\" but then... *looks around confused* ...where's the question? Try: `ask: What's the best way to store acorns?` 🐿️";

const askThinkingResponse: string = "*scurries up thinking tree* 🌳 Let me check my nut collection first, then think...";

const kbNotFoundResponse = (kbIndex: number, totalKbs: number): string =>
  `*rummages through acorn collection* ❌ Hmm, I don't have knowledge nut #${kbIndex} in my collection! I only have ${totalKbs} special nuts stored away! 🥜`;

const kbEmptyQuestionResponse = (kbIndex: number): string =>
  "*chittering excitedly* You want to search my special nut collection but... what should I look for? Try: `ask kb1: Where are the best acorn recipes?` 🐿️";

const kbThinkingResponse = (kbIndex: number): string =>
  `*diving into knowledge nut collection #${kbIndex}* 🥜 Let me dig through my special storage...`;

const askSuccessPrefix = (knowledgeBaseUsed: boolean): string =>
  knowledgeBaseUsed
    ? "*chittering proudly while holding acorn* Found it in my special nut storage! 🥜 "
    : "*scratches head thoughtfully* Hmm, not in my acorn collection, but I figured it out anyway! 🐿️ ";

export {
  getRandomGreeting,
  getRandomThankYou,
  getRandomThinkingPrefix,
  getEmptyMentionResponse,
  getHelpResponse,
  getStatusResponse,
  getInfoResponse,

  // AI Handler responses
  askEmptyResponse,
  askThinkingResponse,
  kbNotFoundResponse,
  kbEmptyQuestionResponse,
  kbThinkingResponse,
  askSuccessPrefix,
};

export type { AIStatus };