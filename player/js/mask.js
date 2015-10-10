function MaskElement(data,element,globalData) {
    this.data = data;
    this.storedData = [];
    this.element = element;
    this.globalData = globalData;
    this.paths = [];
    this.registeredEffects = [];
    this.masksProperties = [];
    this.maskElement = null;
}

MaskElement.prototype.init = function () {
    this.masksProperties = this.data.masksProperties;
    var maskedElement = this.element.maskedElement;
    var defs = this.globalData.defs;
    var i, len = this.masksProperties.length;


    var path, properties = this.data.masksProperties;
    var count = 0;
    var currentMasks = [];
    var j, jLen;
    var layerId = randomString(10);
    var rect, expansor, feMorph;
    this.maskElement = document.createElementNS(svgNS, 'mask');
    for (i = 0; i < len; i++) {

        //console.log('properties[i].mode: ',properties[i].mode);
        if((properties[i].mode == 's' || properties[i].mode == 'i') && count == 0){
            rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('fill', '#ffffff');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', '0');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            currentMasks.push(rect);
        }

        if((properties[i].mode == 'f' && count > 0) || properties[i].mode == 'n') {
            continue;
        }
        count += 1;
        path = document.createElementNS(svgNS, 'path');
        if (properties[i].cl) {
            if(properties[i].mode == 's'){
                path.setAttribute('fill', '#000000');
            }else{
                path.setAttribute('fill', '#ffffff');
            }
        } else {
            path.setAttribute('fill', 'none');
            if(properties[i].mode == 's'){
                path.setAttribute('fill', '#000000');
            }else{
                path.setAttribute('fill', '#ffffff');
            }
            path.setAttribute('stroke-width', '1');
            path.setAttribute('stroke-miterlimit', '10');
        }
        path.setAttribute('clip-rule','nonzero');

        if(properties[i].x.k !== 0){
            var filterID = 'fi_'+randomString(10);
            expansor = document.createElementNS(svgNS,'filter');
            expansor.setAttribute('id',filterID);
            feMorph = document.createElementNS(svgNS,'feMorphology');
            feMorph.setAttribute('operator','dilate');
            feMorph.setAttribute('in','SourceGraphic');
            feMorph.setAttribute('radius','0');
            expansor.appendChild(feMorph);
            defs.appendChild(expansor);
            if(properties[i].mode == 's'){
                path.setAttribute('stroke', '#000000');
            }else{
                path.setAttribute('stroke', '#ffffff');
            }
        }else{
            feMorph = null;
        }


        this.storedData[i] = {
             elem: path,
             expan: feMorph,
            lastPath: '',
            lastOperator:'',
            filterId:filterID,
            lastRadius:0
        };
        if(properties[i].mode == 'i'){
            jLen = currentMasks.length;
            var g = document.createElementNS(svgNS,'g');
            for(j=0;j<jLen;j+=1){
                g.appendChild(currentMasks[j]);
            }
            var mask = document.createElementNS(svgNS,'mask');
            mask.setAttribute('mask-type','alpha');
            mask.setAttribute('id',layerId+'_'+count);
            mask.appendChild(path);
            defs.appendChild(mask);
            g.setAttribute('mask','url(#'+layerId+'_'+count+')');

            currentMasks.length = 0;
            currentMasks.push(g);
        }else{
            currentMasks.push(path);
        }
        if(properties[i].inv && !this.solidPath){
            this.solidPath = this.createLayerSolidPath();
        }
    }

    len = currentMasks.length;
    for(i=0;i<len;i+=1){
        this.maskElement.appendChild(currentMasks[i]);
    }

    this.maskElement.setAttribute('id', layerId);
    if(count > 0){
        maskedElement.setAttribute("mask", "url(#" + layerId + ")");
    }

    defs.appendChild(this.maskElement);
};

MaskElement.prototype.renderFrame = function (num) {
    var i, len = this.data.masksProperties.length;
    var count = 0, feMorph;
    for (i = 0; i < len; i++) {
        if((this.data.masksProperties[i].mode == 'f' && count > 0)  || this.data.masksProperties[i].mode == 'n'){
            continue;
        }
        count += 1;
        this.drawPath(this.data.masksProperties[i],this.data.masksProperties[i].paths[num].pathNodes,this.storedData[i]);
        if(this.storedData[i].expan){
            feMorph = this.storedData[i].expan;
            if(this.data.masksProperties[i].expansion[num] < 0){
                if(this.storedData[i].lastOperator !== 'erode'){
                    this.storedData[i].lastOperator = 'erode';
                    this.storedData[i].elem.setAttribute('filter','url(#'+this.storedData[i].filterId+')');
                }
                if(this.storedData[i].lastRadius !== this.data.masksProperties[i].expansion[num]){
                    feMorph.setAttribute('radius',-this.data.masksProperties[i].expansion[num]);
                    this.storedData[i].lastRadius = this.data.masksProperties[i].expansion[num];
                }
            }else{
                if(this.storedData[i].lastOperator !== 'dilate'){
                    this.storedData[i].lastOperator = 'dilate';
                    this.storedData[i].elem.setAttribute('filter',null);;
                }
                if(this.storedData[i].lastRadius !== this.data.masksProperties[i].expansion[num]){
                    this.storedData[i].elem.setAttribute('stroke-width', this.data.masksProperties[i].expansion[num]*2)
                    this.storedData[i].lastRadius = this.data.masksProperties[i].expansion[num];
                }

            }
        }
    }
};

MaskElement.prototype.processMaskFromEffects = function (num, masks) {
    var i, len = this.registeredEffects.length;
    for (i = 0; i < len; i++) {
        this.registeredEffects[i].renderMask(num, masks);
    }
};

MaskElement.prototype.registerEffect = function (effect) {
    this.registeredEffects.push(effect);
};

MaskElement.prototype.getMaskelement = function () {
    return this.maskElement;
};

MaskElement.prototype.createLayerSolidPath = function(){
    var path = 'M0,0 ';
    path += ' h' + this.globalData.compSize.w ;
    path += ' v' + this.globalData.compSize.h ;
    path += ' h-' + this.globalData.compSize.w ;
    path += ' v-' + this.globalData.compSize.h + ' ';
    return path;
};

MaskElement.prototype.drawPath = function(pathData,pathNodes,storedData){
    var pathString = '';
    var i, len;
    if(!pathNodes.__renderedString){
        len = pathNodes.v.length;
            for(i=1;i<len;i+=1){
                if(i==1){
                    //pathString += " M"+pathNodes.v[0][0]+','+pathNodes.v[0][1];
                    pathString += " M"+bm_rnd(pathNodes.v[0][0])+','+bm_rnd(pathNodes.v[0][1]);
                }
                //pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[i][0]+','+pathNodes.i[i][1] + " "+pathNodes.v[i][0]+','+pathNodes.v[i][1];
                pathString += " C"+bm_rnd(pathNodes.o[i-1][0])+','+bm_rnd(pathNodes.o[i-1][1]) + " "+bm_rnd(pathNodes.i[i][0])+','+bm_rnd(pathNodes.i[i][1]) + " "+bm_rnd(pathNodes.v[i][0])+','+bm_rnd(pathNodes.v[i][1]);
            }
            if(pathData.cl){
                //pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[0][0]+','+pathNodes.i[0][1] + " "+pathNodes.v[0][0]+','+pathNodes.v[0][1];
                pathString += " C"+bm_rnd(pathNodes.o[i-1][0])+','+bm_rnd(pathNodes.o[i-1][1]) + " "+bm_rnd(pathNodes.i[0][0])+','+bm_rnd(pathNodes.i[0][1]) + " "+bm_rnd(pathNodes.v[0][0])+','+bm_rnd(pathNodes.v[0][1]);
            }
        pathNodes.__renderedString = pathString;
    }else{
        pathString = pathNodes.__renderedString;
    }



    if(storedData.lastPath !== pathString){
        if(pathData.inv){
            storedData.elem.setAttribute('d',this.solidPath + pathString);
        }else{
            storedData.elem.setAttribute('d',pathString);
        }
        storedData.lastPath = pathString;
    }
};

MaskElement.prototype.destroy = function(){
    this.element = null;
    this.globalData = null;
    this.maskElement = null;
    this.data = null;
    this.paths = null;
    this.registeredEffects = null;
    this.masksProperties = null;
};