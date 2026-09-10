function visibleAI(config,active){
 return config.aiOrder.filter(id=>config.aiModes[id]==='always'||(config.aiModes[id]==='auto'&&active[id]));
}
module.exports={visibleAI};
