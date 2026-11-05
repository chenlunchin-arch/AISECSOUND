/* Android App 原生朗讀轉接層
   Android 的 WebView 沒有網頁朗讀功能（speechSynthesis），
   這裡用 Capacitor 的 TextToSpeech 外掛模擬同樣的介面，讓 App 的朗讀程式不用改。
   也用 KeepAwake 外掛模擬 navigator.wakeLock，朗讀時讓螢幕保持開啟。 */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform()) return;
  function plugin(name){ return (C.Plugins&&C.Plugins[name])||(C.registerPlugin?C.registerPlugin(name):null); }
  var TTS=plugin("TextToSpeech");
  if(TTS){
    var voices=[], queue=[], busy=false, gen=0;
    function Utterance(text){ this.text=text||""; this.lang="zh-TW"; this.rate=1; this.pitch=1; this.volume=1; this.voice=null; this.onstart=null; this.onend=null; this.onerror=null; }
    function fire(u,name,ev){ try{ if(typeof u[name]==="function") u[name](ev||{}); }catch(e){ console.error(e); } }
    function pump(){
      if(busy) return; var u=queue.shift(); if(!u) return;
      busy=true; var g=gen; fire(u,"onstart");
      var idx=u.voice?voices.indexOf(u.voice):-1;
      resolveLang((u.voice&&u.voice.lang)||u.lang||"zh-TW").then(function(lang){
        if(g!==gen) return;
        var opts={text:u.text,rate:clamp(u.rate,0.1,2.5),pitch:clamp(u.pitch,0.1,2),volume:clamp(u.volume,0,1),queueStrategy:0};
        if(lang) opts.lang=lang;
        if(idx>=0) opts.voice=idx;
        return TTS.speak(opts).then(function(){ if(g!==gen) return; busy=false; fire(u,"onend"); pump(); });
      }).catch(function(){ if(g!==gen) return; busy=false; fire(u,"onerror",{error:"synthesis-unavailable"}); pump(); });
    }
    // 手機沒有指定語言的語音時，外掛會直接拒絕；改用一般中文或系統預設語言
    var langCache={};
    function resolveLang(lang){
      if(langCache[lang]) return langCache[lang];
      var tryLang=function(l){ return TTS.isLanguageSupported?TTS.isLanguageSupported({lang:l}).then(function(r){return !!(r&&r.supported)}).catch(function(){return true}):Promise.resolve(true); };
      return langCache[lang]=tryLang(lang).then(function(ok){ return ok?lang:tryLang("zh").then(function(ok2){ return ok2?"zh":""; }); });
    }
    function clamp(v,a,b){ v=Number(v); if(!isFinite(v)) v=1; return Math.max(a,Math.min(b,v)); }
    var synth={
      onvoiceschanged:null,
      get speaking(){ return busy; },
      get pending(){ return queue.length>0; },
      speak:function(u){ queue.push(u); pump(); },
      cancel:function(){ gen++; var pending=queue.splice(0); busy=false; TTS.stop().catch(function(){}); pending.forEach(function(u){ fire(u,"onerror",{error:"canceled"}); }); },
      pause:function(){}, resume:function(){},
      getVoices:function(){ return voices; }
    };
    window.SpeechSynthesisUtterance=Utterance;
    try{ Object.defineProperty(window,"speechSynthesis",{value:synth,configurable:true,writable:true}); }catch(e){ window.speechSynthesis=synth; }
    TTS.getSupportedVoices().then(function(r){
      voices=((r&&r.voices)||[]).map(function(v,i){ return {name:(v.name||"聲音")+"・"+(v.voiceURI||i),lang:String(v.lang||"").replace("_","-"),voiceURI:v.voiceURI,localService:v.localService,"default":v["default"]}; });
      if(typeof synth.onvoiceschanged==="function") synth.onvoiceschanged();
    }).catch(function(){});
  }
  var KA=plugin("KeepAwake");
  if(KA){
    try{
      Object.defineProperty(navigator,"wakeLock",{configurable:true,value:{request:function(){ return KA.keepAwake().then(function(){ return {release:function(){ return KA.allowSleep(); }}; }); }}});
    }catch(e){}
  }
})();
