function ShapeItemElement(data,parentElement,parentContainer,placeholder,globalData){
    this.lcEnum = {
        '1': 'butt',
        '2': 'round',
        '3': 'butt'
    };
    this.ljEnum = {
        '1': 'miter',
        '2': 'round',
        '3': 'bevel'
    };
    this.stylesList = [];
    this.viewData = [];
    this.shape = parentElement;
    this.parentContainer = parentContainer;
    this.placeholder = placeholder;
    this.data = data;
    this.globalData = globalData;
    this.searchShapes(this.data,this.viewData);
    styleUnselectableDiv(this.shape);
    if(!window.namer){
        window.namer = 1;
    }else{
        window.namer +=1;
    }
    this.testId = 'id_' + window.namer;
}

ShapeItemElement.prototype.appendNodeToParent = BaseElement.prototype.appendNodeToParent;

ShapeItemElement.prototype.searchShapes = function(arr,data){
    var i, len = arr.length - 1;
    var j, jLen;
    var ownArrays = [];
    for(i=len;i>=0;i-=1){
        if(arr[i].ty == 'fl' || arr[i].ty == 'st'){
            data[i] = {
                renderedFrames : [],
                lastData : {
                    c: '',
                    o:-1,
                    w: ''
                }
            };
            var pathElement;
            if(arr[i].ty == 'st') {
                pathElement = document.createElementNS(svgNS, "g");
                pathElement.setAttribute('stroke-linecap', this.lcEnum[arr[i].lc] || 'round');
                pathElement.setAttribute('stroke-linejoin',this.ljEnum[arr[i].lj] || 'round');
                pathElement.setAttribute('fill-opacity','0');
                if(arr[i].lj == 1) {
                    pathElement.setAttribute('stroke-miterlimit',arr[i].ml);
                }
            }else{
                pathElement = document.createElementNS(svgNS, "path");
            }
            if(this.shape === this.parentContainer){
                this.appendNodeToParent(pathElement);
            }else{
                this.shape.appendChild(pathElement);
            }
            this.stylesList.push({
                pathElement: pathElement,
                type: arr[i].ty,
                d: '',
                ld: ''
            });
            data[i].style = this.stylesList[this.stylesList.length - 1];
            ownArrays.push(data[i].style);
        }else if(arr[i].ty == 'gr'){
            data[i] = {
                it: []
            };
            this.searchShapes(arr[i].it,data[i].it);
        }else if(arr[i].ty == 'tr'){
            data[i] = {
                transform : {
                    mat: new Matrix(),
                    opacity: 1
                },
                elements: []
            };
        }else if(arr[i].ty == 'sh' || arr[i].ty == 'rc' || arr[i].ty == 'el'){
            data[i] = {
                elements : [],
                renderedFrames : [],
                styles : [],
                lastData : {
                    d: '',
                    o:'',
                    tr:''
                },
                lastDrawn : {
                    dTr: '',
                    dNTr: '',
                    t: '',
                    mat:[0,0,0,0,0,0],
                    nodes: null
                }
            };
            jLen = this.stylesList.length;
            var element, hasStrokes = false, hasFills = false;
            for(j=0;j<jLen;j+=1){
                if(!this.stylesList[j].closed){
                    if(this.stylesList[j].type === 'st'){
                        hasStrokes = true;
                        element = document.createElementNS(svgNS, "path");
                        this.stylesList[j].pathElement.appendChild(element);
                        data[i].elements.push({
                            ty:this.stylesList[j].type,
                            el:element
                        });
                    }else{
                        hasFills = true;
                        data[i].elements.push({
                            ty:this.stylesList[j].type,
                            st: this.stylesList[j]
                        });
                    }
                }
            }
            data[i].st = hasStrokes;
            data[i].fl = hasFills;
        }
    }
    len = ownArrays.length;
    for(i=0;i<len;i+=1){
        ownArrays[i].closed = true;
    }
};

ShapeItemElement.prototype.getElement = function(){
    return this.shape;
};

ShapeItemElement.prototype.hideShape = function(){
    var i, len = this.stylesList.length;
    for(i=len-1;i>=0;i-=1){
        if(this.stylesList[i].ld !== 0){
            this.stylesList[i].ld = 0;
            this.stylesList[i].pathElement.style.display = 'none';
            if(this.stylesList[i].pathElement.parentNode){
                this.stylesList[i].parent = this.stylesList[i].pathElement.parentNode;
                //this.stylesList[i].pathElement.parentNode.removeChild(this.stylesList[i].pathElement);
            }
        }
        /*if(this.stylesList[i].type === 'st'){
         this.stylesList[i].pathElement.setAttribute('visibility','hidden');
         this.stylesList[i].ld = 0;
         }else{
         this.stylesList[i].pathElement.setAttribute('d','M 0,0');
         this.stylesList[i].ld = 'M 0,0';
         }*/
    }
};

ShapeItemElement.prototype.renderShape = function(num,parentTransform,items,data,isMain){
    var i, len;
    if(!items){
        items = this.data;
        len = this.stylesList.length;
        for(i=0;i<len;i+=1){
            this.stylesList[i].d = '';
        }
    }
    if(!data){
        data = this.viewData;
    }
    this.frameNum = num;
    ///
    ///
    len = items.length - 1;
    var groupTransform,groupMatrix;
    groupTransform = parentTransform;
    for(i=len;i>=0;i-=1){
        if(items[i].ty == 'tr'){
            var mtArr = items[i].renderedData[num].mtArr;
            groupTransform = data[i].transform;
            groupMatrix = groupTransform.mat;
            groupMatrix.reset();
            if(parentTransform){
                var props = parentTransform.mat.props;
                groupTransform.opacity = parentTransform.opacity;
                groupTransform.opacity *= items[i].renderedData[num].o;
                groupMatrix.transform(props[0],props[1],props[2],props[3],props[4],props[5]);
            }else{
                groupTransform.opacity = items[i].renderedData[num].o;
            }
            groupMatrix.transform(mtArr[0],mtArr[1],mtArr[2],mtArr[3],mtArr[4],mtArr[5]).translate(-items[i].renderedData[num].a[0],-items[i].renderedData[num].a[1]);
        }else if(items[i].ty == 'sh'){
            this.renderPath(items[i],data[i],num,groupTransform);
        }else if(items[i].ty == 'el'){
            this.renderPath(items[i],data[i],num,groupTransform);
            //this.renderEllipse(items[i],data[i],num,groupTransform);
        }else if(items[i].ty == 'rc'){
            if(items[i].trimmed){
                this.renderPath(items[i],data[i],num,groupTransform);
            }else{
                this.renderRect(items[i],data[i],num,groupTransform);
            }
        }else if(items[i].ty == 'fl'){
            this.renderFill(items[i],data[i],num,groupTransform);
        }else if(items[i].ty == 'st'){
            this.renderStroke(items[i],data[i],num,groupTransform);
        }else if(items[i].ty == 'gr'){
            this.renderShape(num,groupTransform,items[i].it,data[i].it);
        }else if(items[i].ty == 'tm'){
            //
        }
    }
    if(!isMain){
        return;
    }
    len = this.stylesList.length;
    for(i=0;i<len;i+=1){
        if(this.stylesList[i].ld === 0) {
            this.stylesList[i].ld = 1;
            this.stylesList[i].pathElement.style.display = 'block';
            //this.stylesList[i].parent.appendChild(this.stylesList[i].pathElement);
        }
        if(this.stylesList[i].type === 'fl'){
            /*if(this.stylesList[i].d == '' && this.stylesList[i].ld !== ''){
             this.stylesList[i].pathElement.setAttribute('d','M 0,0');
             this.stylesList[i].ld = this.stylesList[i].d;
             }else*/ if(this.stylesList[i].ld !== this.stylesList[i].d){
                this.stylesList[i].pathElement.setAttribute('d',this.stylesList[i].d);
                this.stylesList[i].ld = this.stylesList[i].d;
            }
        }/*else if(this.stylesList[i].ld === 0){
         this.stylesList[i].ld = 1;
         this.stylesList[i].pathElement.setAttribute('visibility','visible');
         }*/
    }

};

ShapeItemElement.prototype.renderPath = function(pathData,viewData,num,groupTransform){
    var len, i,j;
    var pathNodes = pathData.renderedData[num].path.pathNodes;
    var t = '';
    var pathStringTransformed = '';
    var pathStringNonTransformed = '';
    if(pathNodes.v){
        len = pathNodes.v.length;
        var redraw = true;
        if(viewData.lastDrawn.nodes){
            redraw = false;
            if(groupTransform.mat.props[0] !== viewData.lastDrawn.mat[0] || groupTransform.mat.props[1] !== viewData.lastDrawn.mat[1]
                || groupTransform.mat.props[2] !== viewData.lastDrawn.mat[2] || groupTransform.mat.props[3] !== viewData.lastDrawn.mat[3]
                || groupTransform.mat.props[4] !== viewData.lastDrawn.mat[4] || groupTransform.mat.props[5] !== viewData.lastDrawn.mat[5]){
                redraw = true;
            }
            redraw = redraw ? redraw : viewData.lastDrawn.nodes !== pathNodes;
            /** Todo decide if doing this extra validations makes sense
             if(!redraw){
                var lNodes = viewData.lastDrawn.nodes;
                i = 0;
                while(i<len){
                    if(pathNodes.v[i][0] !== lNodes.v[i][0] || pathNodes.v[i][1] !== lNodes.v[i][1]
                    || pathNodes.i[i][0] !== lNodes.i[i][0] || pathNodes.i[i][1] !== lNodes.i[i][1]
                    || pathNodes.o[i][0] !== lNodes.o[i][0] || pathNodes.o[i][1] !== lNodes.o[i][1]){
                        redraw = true;
                        break;
                    }
                    i+=1;
                }
            }*/
        }
        if(redraw) {
            var stops = pathNodes.s ? pathNodes.s : [];
            for (i = 1; i < len; i += 1) {
                if (stops[i - 1]) {
                    if (viewData.st) {
                        pathStringNonTransformed += " M" + bm_rnd(stops[i - 1][0]) + ',' + bm_rnd(stops[i - 1][1]);
                    }
                    if (viewData.fl) {
                        pathStringTransformed += " M" + groupTransform.mat.applyToPointStringified(stops[i - 1][0], stops[i - 1][1]);
                    }
                } else if (i == 1) {
                    if (viewData.st) {
                        pathStringNonTransformed += " M" + bm_rnd(pathNodes.v[0][0]) + ',' + bm_rnd(pathNodes.v[0][1]);
                    }

                    if (viewData.fl) {
                        pathStringTransformed += " M" + groupTransform.mat.applyToPointStringified(pathNodes.v[0][0], pathNodes.v[0][1]);
                    }
                }
                if (viewData.st) {
                    pathStringNonTransformed += " C" + bm_rnd(pathNodes.o[i - 1][0]) + ',' + bm_rnd(pathNodes.o[i - 1][1]) + " " + bm_rnd(pathNodes.i[i][0]) + ',' + bm_rnd(pathNodes.i[i][1]) + " " + bm_rnd(pathNodes.v[i][0]) + ',' + bm_rnd(pathNodes.v[i][1]);
                }

                if (viewData.fl) {
                    pathStringTransformed += " C" + groupTransform.mat.applyToPointStringified(pathNodes.o[i - 1][0], pathNodes.o[i - 1][1]) + " " + groupTransform.mat.applyToPointStringified(pathNodes.i[i][0], pathNodes.i[i][1]) + " " + groupTransform.mat.applyToPointStringified(pathNodes.v[i][0], pathNodes.v[i][1]);
                }
            }
            if (len == 1) {
                if (stops[0]) {
                    if (viewData.st) {
                        pathStringNonTransformed += " M" + bm_rnd(stops[0][0]) + ',' + bm_rnd(stops[0][1]);
                    }

                    if (viewData.fl) {
                        pathStringTransformed += " M" + groupTransform.mat.applyToPointStringified(stops[0][0], stops[0][1]);
                    }
                } else {

                    if (viewData.st) {
                        pathStringNonTransformed += " M" + bm_rnd(pathNodes.v[0][0]) + ',' + bm_rnd(pathNodes.v[0][1]);
                    }

                    if (viewData.fl) {
                        pathStringTransformed += " M" + groupTransform.mat.applyToPointStringified(pathNodes.v[0][0], pathNodes.v[0][1]);
                    }
                }
            }
            if (pathData.closed && !(pathData.trimmed && !pathNodes.c)) {
                if (viewData.st) {
                    pathStringNonTransformed += " C" + bm_rnd(pathNodes.o[i - 1][0]) + ',' + bm_rnd(pathNodes.o[i - 1][1]) + " " + bm_rnd(pathNodes.i[0][0]) + ',' + bm_rnd(pathNodes.i[0][1]) + " " + bm_rnd(pathNodes.v[0][0]) + ',' + bm_rnd(pathNodes.v[0][1]);
                }

                if (viewData.fl) {
                    pathStringTransformed += " C" + groupTransform.mat.applyToPointStringified(pathNodes.o[i - 1][0], pathNodes.o[i - 1][1]) + " " + groupTransform.mat.applyToPointStringified(pathNodes.i[0][0], pathNodes.i[0][1]) + " " + groupTransform.mat.applyToPointStringified(pathNodes.v[0][0], pathNodes.v[0][1]);
                }
            }
            if (viewData.st) {
                t = 'matrix(' + groupTransform.mat.props.join(',') + ')';
            }
            viewData.lastDrawn.dTr = pathStringTransformed;
            viewData.lastDrawn.dNTr = pathStringNonTransformed;
            viewData.lastDrawn.t = t;
            for(j=0;j<6;j+=1){
                viewData.lastDrawn.mat[j] = groupTransform.mat.props[j];
            }
            viewData.lastDrawn.nodes = pathNodes;
        }
    }else{
        viewData.lastDrawn.dTr = '';
        viewData.lastDrawn.dNTr = '';
        viewData.lastDrawn.t = '';
        for(j=0;j<6;j+=1){
            viewData.lastDrawn.mat[j] = 0;
        }
        viewData.lastDrawn.nodes = null;
    }
    var renderedFrameData = viewData.lastDrawn;
    viewData.renderedFrames[this.globalData.frameNum] = null;
    len = viewData.elements.length;
    for(i=0;i<len;i+=1){
        if(viewData.elements[i].ty === 'st'){
            if(viewData.ld != renderedFrameData.dNTr) {
                viewData.elements[i].el.setAttribute('d', renderedFrameData.dNTr);
                viewData.ld = renderedFrameData.dNTr;
            }
            if(viewData.lt != renderedFrameData.t) {
                ////viewData.elements[i].el.setAttribute('transform',renderedFrameData.t);
                viewData.elements[i].el.style.transform = renderedFrameData.t;
                viewData.lt = renderedFrameData.t;
            }
        }else{
            viewData.elements[i].st.d += renderedFrameData.dTr;
        }
    }
};

ShapeItemElement.prototype.renderFill = function(styleData,viewData,num, groupTransform){
    var fillData = styleData.renderedData[num];
    var styleElem = viewData.style;
    if(!viewData.renderedFrames[this.globalData.frameNum]){
        if(viewData._ld && viewData._ld.c === fillData.color && viewData._ld.o === fillData.opacity*groupTransform.opacity){
            viewData.renderedFrames[this.globalData.frameNum] = viewData._ld;
            return;
        }else{
            viewData._ld = {
                c: fillData.color,
                o: fillData.opacity*groupTransform.opacity
            };
            viewData.renderedFrames[this.globalData.frameNum] = viewData._ld;
        }
    }

    var renderedFrameData = viewData.renderedFrames[this.globalData.frameNum];
    if(viewData.lastData.c != renderedFrameData.c){
        styleElem.pathElement.setAttribute('fill',renderedFrameData.c);
        viewData.lastData.c = renderedFrameData.c;
    }
    if(viewData.lastData.o != renderedFrameData.o){
        styleElem.pathElement.setAttribute('fill-opacity',renderedFrameData.o);
        viewData.lastData.o = renderedFrameData.o;
    }
};

ShapeItemElement.prototype.renderStroke = function(styleData,viewData,num, groupTransform){
    var fillData = styleData.renderedData[num];
    var styleElem = viewData.style;
    if(!viewData.renderedFrames[this.globalData.frameNum]){
        if(viewData._ld && viewData._ld.c === fillData.color && viewData._ld.o === fillData.opacity*groupTransform.opacity && viewData._ld.w === fillData.width){
            viewData.renderedFrames[this.globalData.frameNum] = viewData._ld;
            return;
        }else{
            viewData._ld = {
                c: fillData.color,
                o: fillData.opacity*groupTransform.opacity,
                w: fillData.width
            };
            viewData.renderedFrames[this.globalData.frameNum] = viewData._ld;
        }
        if(fillData.dashes){
            viewData.renderedFrames[this.globalData.frameNum].d = fillData.dashes;
        }
    }

    var renderedFrameData = viewData.renderedFrames[this.globalData.frameNum];
    var c = renderedFrameData.c;
    var o = renderedFrameData.o;
    var w = renderedFrameData.w;
    var d = renderedFrameData.d;
    var dasharray,dashoffset;
    if(d){
        var j, jLen = d.length;
        dasharray = '';
        dashoffset = '';
        for(j=0;j<jLen;j+=1){
            if(d[j].n != 'o'){
                dasharray += ' ' + d[j].v;
            }else{
                dashoffset += d[j].v;
            }
        }
        if(viewData.lastData.da != dasharray){
            styleElem.pathElement.setAttribute('stroke-dasharray',dasharray);
            viewData.lastData.da = dasharray;
        }
        if(viewData.lastData.do != dashoffset){
            styleElem.pathElement.setAttribute('stroke-dashoffset',dashoffset);
            viewData.lastData.do = dashoffset;
        }
    }
    if(viewData.lastData.c != c){
        styleElem.pathElement.setAttribute('stroke',c);
        viewData.lastData.c = c;
    }
    if(viewData.lastData.o != o){
        styleElem.pathElement.setAttribute('stroke-opacity',o);
        viewData.lastData.o = o;
    }
    if(viewData.lastData.w !== w){
        styleElem.pathElement.setAttribute('stroke-width',w);
        viewData.lastData.w = w;
    }
};

ShapeItemElement.prototype.destroy = function(items, data){
    this.shape = null;
    this.data = null;
    this.viewData = null;
    this.parentContainer = null;
    this.placeholder = null;
    /*if(!items){
     items = this.data;
     }
     if(!data){
     data = this.viewData;
     }
     var i, len = items.length;
     var groupTransform,groupMatrix;
     groupTransform = parentTransform;
     for(i = 0; i < len; i += 1){
     if(items[i].ty == 'tr'){
     }else if(items[i].ty == 'sh'){
     this.renderPath(items[i],data[i],num,groupTransform);
     }else if(items[i].ty == 'el'){
     this.renderPath(items[i],data[i],num,groupTransform);
     //this.renderEllipse(items[i],data[i],num,groupTransform);
     }else if(items[i].ty == 'rc'){
     if(items[i].trimmed){
     this.renderPath(items[i],data[i],num,groupTransform);
     }else{
     this.renderRect(items[i],data[i],num,groupTransform);
     }
     }else if(items[i].ty == 'fl'){
     this.renderFill(items[i],data[i],num,groupTransform);
     }else if(items[i].ty == 'st'){
     this.renderStroke(items[i],data[i],num,groupTransform);
     }else if(items[i].ty == 'gr'){
     this.renderShape(num,groupTransform,items[i].it,data[i].it);
     }else if(items[i].ty == 'tm'){
     //
     }
     }*/
};