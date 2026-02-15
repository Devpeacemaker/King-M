// ✅ CORRECT PATH (Since both files are in the Database folder)
const { getSettings } = require('./config'); 

async function fetchSettings() {
  const data = await getSettings();

  return {
    wapresence: data.wapresence,
    autoread: data.autoread,
    mode: data.mode,
    prefix: data.prefix,
    autolike: data.autolike,
    autoview: data.autoview,
    antilink: data.antilink,
    antilinkall: data.antilinkall,
    antidelete: data.antidelete,
    antitag: data.antitag,
    antiforeign: data.antiforeign,
    antibot: data.antibot,
    welcomegoodbye: data.welcomegoodbye,
    autobio: data.autobio,
    autobioText: data.autobioText,
    badword: data.badword,
    gptdm: data.gptdm, 
    anticall: data.anticall, 
    antiedit: data.antiedit,
    antistatusmention: data.antistatusmention,
    antistatuslink: data.antistatuslink,
    menuTitle: data.menuTitle,
    antisticker: data.antisticker,
    antigroupmention: data.antigroupmention,
    
    // ✅ THIS IS PERFECT
    autolike_emojis: data.autolike_emojis 
  };
}

module.exports = fetchSettings;
