const paths={
 play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="3.5"/>',
 previous:'<path d="M5 5v14M19 5l-10 7 10 7Z"/>',
 next:'<path d="M19 5v14M5 5l10 7-10 7Z"/>',
 more:'<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
 queue:'<path d="M4 6h10M4 11h10M4 16h6M17 13v8M13 17h8"/>',
 shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3M18 3l3 3-3 3M3 18h3c1.7 0 3-1.3 4.1-3M15 8.7C16 7.1 17 6 18 6h3M18 15l3 3-3 3"/>',
 repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
 repeatOne:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/><path d="m11 10 1-1v6"/>'
};
function musicIcon(name){return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.play)+'</svg>';}
module.exports={musicIcon};
