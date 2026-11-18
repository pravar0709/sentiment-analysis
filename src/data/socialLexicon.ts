export interface SamplePreset {
  id: string;
  label: string;
  focus: string;
  text: string;
}

export interface LexiconEntry {
  token: string;
  expansion: string;
  kind:
    | 'Abbreviation'
    | 'World Language'
    | 'Hinglish'
    | 'Global English'
    | 'Emoji'
    | 'Symbol / Sign';
  socialMeaning: string;
  typicalSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Context-Dependent';
  exampleSentence: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'spanish-sarcasm',
    label: 'Spanish sarcasm + slang',
    focus: 'Original Spanish irony & shorthand',
    text: '¡Qué servicio tan maravilloso, 2 horas esperando y ni responden 🙄 tqm soporte técnico /s',
  },
  {
    id: 'hindi-pure',
    label: 'Pure Hindi (Devanagari)',
    focus: 'Original Hindi with sarcasm & emojis',
    text: 'वाह भाई, क्या शानदार अपडेट दिया है 🙄 पूरा ऐप हर दो मिनट में बंद हो रहा है 💀',
  },
  {
    id: 'french-slang',
    label: 'French social slang',
    focus: 'Original French colloquialisms & abbreviations',
    text: 'Franchement ce film était une dinguerie, j’ai trop kiffé mdr 🔥🫶',
  },
  {
    id: 'hinglish-mix',
    label: 'Hinglish (only mix)',
    focus: 'Code-mixed Hindi + English',
    text: 'yaar camera bilkul mast hai par battery life dimaag kharab pmo fr 💀',
  },
  {
    id: 'global-uk-au',
    label: 'UK / AU English idioms',
    focus: 'World English dialect contrast',
    text: 'yeah nah mate I was properly chuffed with the audio, though the price left me gutted :/',
  },
];

export const SOCIAL_LEXICON: LexiconEntry[] = [
  {
    token: 'ily / ilysm',
    expansion: 'I love you / I love you so much (English)',
    kind: 'Abbreviation',
    socialMeaning: 'Warm affection, gratitude, or hype toward friends, creators, or partners.',
    typicalSentiment: 'Positive',
    exampleSentence: 'tysm for staying up to help me debug that, ily sm 🫶',
  },
  {
    token: 'icl / ts / pmo',
    expansion: "I can't lie / this (shit) / pisses me off (or put me on)",
    kind: 'Abbreviation',
    socialMeaning: 'Recent social media shorthand whose polarity shifts sharply with surrounding context.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'icl ts update pmo so bad atp 😭💀',
  },
  {
    token: 'tqm / xq / jajaja',
    expansion: 'Te quiero mucho / Porque / Laughter (Spanish)',
    kind: 'World Language',
    socialMeaning: 'Original Spanish social shorthand expressing affection (tqm), reason (xq), or laughter.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'gracias por ayudarme siempre tqm 🫶✨',
  },
  {
    token: 'mdr / ptdr / kiffer',
    expansion: 'Mort de rire / Pété de rire / To really love (French)',
    kind: 'World Language',
    socialMeaning: 'Original French internet abbreviations for laughing hard and strong enthusiasm.',
    typicalSentiment: 'Positive',
    exampleSentence: 'ce concert était incroyable, j’ai trop kiffé mdr 🔥',
  },
  {
    token: '草 / www / 神',
    expansion: 'Kusa (laughing) / Warau / God-tier (Japanese)',
    kind: 'World Language',
    socialMeaning: 'Original Japanese net slang where 草 (grass = lol) and 神 (amazing) express humor or awe.',
    typicalSentiment: 'Positive',
    exampleSentence: 'このゲーム神すぎてずっと笑ってる 草 😭🔥',
  },
  {
    token: 'ㅋㅋㅋ / 대박 / ㅠㅠ',
    expansion: 'Laughter / Amazing / Crying (Korean)',
    kind: 'World Language',
    socialMeaning: 'Original Korean Hangul consonant shorthand for laughter (ㅋㅋㅋ), awe (대박), or sadness.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: '진짜 대박이다 너무 웃겨서 눈물 나 ㅋㅋㅋ 😭',
  },
  {
    token: 'वाह / शानदार / बकवास',
    expansion: 'Bravo / Fantastic / Rubbish (Pure Hindi)',
    kind: 'World Language',
    socialMeaning: 'Original Hindi expressions in Devanagari; "वाह" frequently flips sarcastic with 🙄.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'वाह क्या शानदार नेटवर्क है, वीडियो ही नहीं चल रहा 🙄',
  },
  {
    token: 'mast / bakwas / kaand',
    expansion: 'Awesome / Rubbish / Mess-up (Hinglish)',
    kind: 'Hinglish',
    socialMeaning: 'Code-mixed Hindi + English slang (the only supported mixed-language hybrid).',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'yaar UI toh mast hai par login mein bada kaand ho gaya 😭',
  },
  {
    token: 'chuffed / gutted',
    expansion: 'Delighted / Deeply disappointed (UK English)',
    kind: 'Global English',
    socialMeaning: 'British/Commonwealth idioms where "chuffed" is strong praise and "gutted" is disappointment.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'properly chuffed we won, though gutted about the rain delay :)',
  },
  {
    token: 'yeah nah / nah yeah',
    expansion: 'Polite no / Emphatic yes (AU/NZ English)',
    kind: 'Global English',
    socialMeaning: 'Australian/Kiwi discourse rule: the final word decides ("yeah nah" = no; "nah yeah" = yes).',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'yeah nah mate, that pricing is way too dodgy for me :/',
  },
  {
    token: 'shiok / wahala',
    expansion: 'Delightful (Singlish) / Trouble or drama (Nigerian Pidgin)',
    kind: 'Global English',
    socialMeaning: 'World English regional anchors expressing pure delight (shiok) or stressful chaos (wahala).',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'omo this traffic wahala today is too much abeg 🫠',
  },
  {
    token: '💀 / 😭 / 🙄',
    expansion: 'Skull / Crying / Rolling eyes',
    kind: 'Emoji',
    socialMeaning: 'Universal social cues: 💀/😭 often mean hysterical laughter; 🙄 signals verbal irony.',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'bro really replied "you too" to the waiter 💀😭',
  },
  {
    token: '<3 / :/ / /s',
    expansion: 'Heart / Uneasy face / Sarcasm tag',
    kind: 'Symbol / Sign',
    socialMeaning: 'Cross-lingual ASCII emoticons and tone tags carrying affection (<3), unease (:/), or irony (/s).',
    typicalSentiment: 'Context-Dependent',
    exampleSentence: 'love it when the server restarts mid-viva /s',
  },
];
