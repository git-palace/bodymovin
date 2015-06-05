function CVCompElement(data, renderer,globalData){
    this.parent.constructor.call(this,data, renderer,globalData);
    this.layers = data.layers;
}
createElement(CVBaseElement, CVCompElement);

CVCompElement.prototype.prepareFrame = function(num){
    var renderParent = this.parent.prepareFrame.call(this,num);
    if(renderParent===false){
        return;
    }
    var i,len = this.elements.length;
    var timeRemapped = this.data.tm ? this.data.tm[num] < 0 ? 0 : num >= this.data.tm.length ? this.data.tm[this.data.tm.length - 1] : this.data.tm[num] : num;
    for( i = 0; i < len; i+=1 ){
        this.elements[i].prepareFrame(timeRemapped - this.layers[i].startTime);
    }
};

CVCompElement.prototype.draw = function(){
    this.renderer.canvasContext.save();
    if(this.parent.draw.call(this,false)===false){
        this.renderer.canvasContext.restore();
        return;
    }
    var i,len = this.layers.length;
    for( i = len - 1; i >= 0; i -= 1 ){
        this.elements[i].draw();
    }
    this.renderer.canvasContext.restore();
};

CVCompElement.prototype.setElements = function(elems){
    this.elements = elems;
};

CVCompElement.prototype.getElements = function(){
    return this.elements;
};