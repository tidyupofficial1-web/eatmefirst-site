
const intro=document.querySelector('#retailIntro'),ad=document.querySelector('#retailAd'),video=ad.querySelector('video');let destination=null;
document.querySelector('#retailClose').onclick=()=>intro.close();
document.querySelectorAll('.menu-card').forEach(link=>link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();destination=link.href;video.currentTime=0;document.querySelector('#retailFallback').hidden=true;document.querySelector('#retailError').hidden=true;ad.showModal();video.play().then(()=>document.querySelector('#retailPlay').hidden=true).catch(()=>document.querySelector('#retailPlay').hidden=false)}));
function proceed(){const target=destination;destination=null;video.pause();if(ad.open)ad.close();if(target)location.assign(target)}
document.querySelector('#retailPlay').onclick=()=>video.play().then(()=>document.querySelector('#retailPlay').hidden=true).catch(()=>{});
video.addEventListener('ended',proceed);video.addEventListener('error',()=>{document.querySelector('#retailFallback').hidden=false;document.querySelector('#retailError').hidden=false;document.querySelector('#retailPlay').hidden=true});
document.querySelector('#retailFallback').onclick=proceed;ad.addEventListener('cancel',()=>video.pause());ad.addEventListener('close',()=>video.pause());
const hide=document.querySelector('#chkHideMenuGuide');if(hide){hide.removeAttribute('onchange');hide.onchange=()=>{document.querySelector('#menuGuideBox').hidden=hide.checked;document.querySelector('#menuGuideBox').style.display=hide.checked?'none':''}}
function showIntroduction(){video.pause();if(ad.open)ad.close();destination=null;if(!intro.open)intro.showModal();}
window.addEventListener('pageshow',showIntroduction);
showIntroduction();
