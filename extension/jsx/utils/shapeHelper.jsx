/*jslint vars: true , plusplus: true, continue:true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global bm_keyframeHelper, bm_eventDispatcher, bm_generalUtils, PropertyFactory, Matrix*/
var bm_shapeHelper = (function () {
    'use strict';
    var ob = {}, shapeItemTypes = {
        shape: 'sh',
        rect: 'rc',
        ellipse: 'el',
        fill: 'fl',
        stroke: 'st',
        merge: 'mm',
        trim: 'tm',
        group: 'gr'
    };

    function getItemType(matchName) {
        switch (matchName) {
        case 'ADBE Vector Shape - Group':
            return shapeItemTypes.shape;
        case 'ADBE Vector Shape - Rect':
            return shapeItemTypes.rect;
        case 'ADBE Vector Shape - Ellipse':
            return shapeItemTypes.ellipse;
        case 'ADBE Vector Graphic - Fill':
            return shapeItemTypes.fill;
        case 'ADBE Vector Graphic - Stroke':
            return shapeItemTypes.stroke;
        case 'ADBE Vector Graphic - Merge':
        case 'ADBE Vector Filter - Merge':
            return shapeItemTypes.merge;
        case 'ADBE Vector Graphic - Trim':
        case 'ADBE Vector Filter - Trim':
            return shapeItemTypes.trim;
        case 'ADBE Vector Group':
            return shapeItemTypes.group;
        default:
            return '';
        }
    }
    
    function reverseShape(ks, isClosed) {
        var newI = [], newO = [], newV = [];
        var i, len;
        if (ks.i) {
            var init = 0;
            if (isClosed) {
                newI[0] = ks.o[0];
                newO[0] = ks.i[0];
                newV[0] = ks.v[0];
                init = 1;
            }
            len = ks.i.length;
            var cnt = len - 1;
            
            for (i = init; i < len; i += 1) {
                newI.push(ks.o[cnt]);
                newO.push(ks.i[cnt]);
                newV.push(ks.v[cnt]);
                cnt -= 1;
            }
            
            ks.i = newI;
            ks.o = newO;
            ks.v = newV;
        } else {
            len = ks.length;
            for (i = 0; i < len - 1; i += 1) {
                reverseShape(ks[i].s[0], isClosed);
                reverseShape(ks[i].e[0], isClosed);
            }
        }
    }
    
    function iterateProperties(iteratable, array, frameRate, isText) {
        var i, len = iteratable.numProperties, ob, prop, itemType;
        for (i = 0; i < len; i += 1) {
            prop = iteratable.property(i + 1);
            if (prop.enabled) {
                itemType = getItemType(prop.matchName);
                if (isText && itemType !== shapeItemTypes.shape && itemType !== shapeItemTypes.group && itemType !== shapeItemTypes.merge) {
                    continue;
                }
                if (itemType === shapeItemTypes.shape) {
                    ob = {};
                    ob.ind = i;
                    ob.ty = itemType;
                    ob.closed = prop.property('Path').value.closed;
                    ob.ks = bm_keyframeHelper.exportKeyframes(prop.property('Path'), frameRate);
                    if (prop.property("Shape Direction").value === 3) {
                        reverseShape(ob.ks.k, ob.closed);
                    }
                    //bm_generalUtils.convertPathsToAbsoluteValues(ob.ks.k);
                } else if (itemType === shapeItemTypes.rect && !isText) {
                    ob = {};
                    ob.ty = itemType;
                    ob.d = prop.property("Shape Direction").value;
                    ob.s = bm_keyframeHelper.exportKeyframes(prop.property('Size'), frameRate);
                    ob.p = bm_keyframeHelper.exportKeyframes(prop.property('Position'), frameRate);
                    ob.r = bm_keyframeHelper.exportKeyframes(prop.property('Roundness'), frameRate);
                } else if (itemType === shapeItemTypes.ellipse) {
                    ob = {};
                    ob.d = prop.property("Shape Direction").value;
                    ob.ty = itemType;
                    ob.s = bm_keyframeHelper.exportKeyframes(prop.property('Size'), frameRate);
                    ob.p = bm_keyframeHelper.exportKeyframes(prop.property('Position'), frameRate);
                    array.push(ob);
                } else if (itemType === shapeItemTypes.fill) {
                    ob = {};
                    ob.ty = itemType;
                    ob.fillEnabled = prop.enabled;
                    ob.c = bm_keyframeHelper.exportKeyframes(prop.property('Color'), frameRate);
                    ob.o = bm_keyframeHelper.exportKeyframes(prop.property('Opacity'), frameRate);
                } else if (itemType === shapeItemTypes.stroke) {
                    ob = {};
                    ob.ty = itemType;
                    ob.fillEnabled = prop.enabled;
                    ob.c = bm_keyframeHelper.exportKeyframes(prop.property('Color'), frameRate);
                    ob.o = bm_keyframeHelper.exportKeyframes(prop.property('Opacity'), frameRate);
                    ob.w = bm_keyframeHelper.exportKeyframes(prop.property('Stroke Width'), frameRate);
                    ob.lc = prop.property('Line Cap').value;
                    ob.lj = prop.property('Line Join').value;
                    if (ob.lj === 1) {
                        ob.ml = prop.property('Miter Limit').value;
                    }
                    var j, jLen = prop.property('Dashes').numProperties;
                    var dashesData = [];
                    var changed = false;
                    for (j = 0; j < jLen; j += 1) {
                        if (prop.property('Dashes').property(j + 1).canSetExpression) {
                            changed = true;
                            var dashData = {};
                            var name = '';
                            if (prop.property('Dashes').property(j + 1).name.indexOf('Dash') !== -1) {
                                name = 'd';
                            } else if (prop.property('Dashes').property(j + 1).name.indexOf('Gap') !== -1) {
                                name = 'g';
                            } else if (prop.property('Dashes').property(j + 1).name === 'Offset') {
                                name = 'o';
                            }
                            dashData.n = name;
                            dashData.nm = prop.property('Dashes').property(j + 1).name.toLowerCase().split(' ').join('');
                            dashData.v = bm_keyframeHelper.exportKeyframes(prop.property('Dashes').property(j + 1), frameRate);
                            dashesData.push(dashData);
                        }
                    }
                    if (changed) {
                        ob.d = dashesData;
                    }
                } else if (itemType === shapeItemTypes.merge) {
                    ob = {};
                    ob.ty = itemType;
                    ob.mm = prop.property('ADBE Vector Merge Type').value;
                } else if (itemType === shapeItemTypes.trim) {
                    ob = {};
                    ob.ty = itemType;
                    ob.s = bm_keyframeHelper.exportKeyframes(prop.property('Start'), frameRate);
                    ob.e = bm_keyframeHelper.exportKeyframes(prop.property('End'), frameRate);
                    ob.o = bm_keyframeHelper.exportKeyframes(prop.property('Offset'), frameRate);
                    ob.m = prop.property('Trim Multiple Shapes').value;
                } else if (itemType === shapeItemTypes.group) {
                    ob = {
                        ty : itemType,
                        it: [],
                        nm: prop.name
                    };
                    iterateProperties(prop.property('Contents'), ob.it, frameRate, isText);
                    if (!isText) {
                        var trOb = {};
                        var transformProperty = prop.property('Transform');
                        trOb.ty = 'tr';
                        trOb.p = bm_keyframeHelper.exportKeyframes(transformProperty.property('Position'), frameRate);
                        trOb.a = bm_keyframeHelper.exportKeyframes(transformProperty.property('Anchor Point'), frameRate);
                        trOb.s = bm_keyframeHelper.exportKeyframes(transformProperty.property('Scale'), frameRate);
                        trOb.r = bm_keyframeHelper.exportKeyframes(transformProperty.property('Rotation'), frameRate);
                        trOb.o = bm_keyframeHelper.exportKeyframes(transformProperty.property('Opacity'), frameRate);
                        ob.it.push(trOb);
                    }
                }
                if (ob) {
                    ob.nm = prop.name;
                    array.push(ob);
                }
            }
            
        }
    }
    
    
    
    
    

    function getPoint(p1, p2, p3, p4, t) {
        var a = p1[0], b = p2[0], c = p3[0], d = p4[0];
        var x = a * Math.pow(1 - t, 3) + b * 3 * Math.pow(1 - t, 2) * t + c * 3 * (1 - t) * Math.pow(t, 2) + d * Math.pow(t, 3);
        a = p1[1];
        b = p2[1];
        c = p3[1];
        d = p4[1];
        var y = a * Math.pow(1 - t, 3) + b * 3 * Math.pow(1 - t, 2) * t + c * 3 * (1 - t) * Math.pow(t, 2) + d * Math.pow(t, 3);
        return [x, y];
    }

    function getTPos(p1, p2, p3, p4, arr) {
        var i;
        for (i = 0; i < 2; i += 1) {
            var c1 = p1[i], c2 = p2[i], c3 = p3[i], c4 = p4[i];
            var a = 3 * (-c1 + 3 * c2 - 3 * c3 + c4);
            var b = 6 * (c1 - 2 * c2 + c3);
            var c = 3 * (c2 - c1);
            var toSquareTerm = Math.pow(b, 2) - 4 * a * c;
            if (toSquareTerm >= 0) {
                var t1 = (-b + Math.sqrt(toSquareTerm)) / (2 * a);
                var t2 = (-b - Math.sqrt(toSquareTerm)) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    arr.push(getPoint(p1, p2, p3, p4, t1));
                }
                if (t2 >= 0 && t2 <= 1) {
                    arr.push(getPoint(p1, p2, p3, p4, t2));
                }
            }
        }
    }

    function getBoundingBox(p1, p2, p3, p4, bounds) {
        var pts = [p1, p4];
        getTPos(p1, p2, p3, p4, pts);

        var minX = bounds.l, minY = bounds.t, maxX = bounds.r, maxY = bounds.b, pt;
        var i, len = pts.length;
        for (i = 1; i < len; i += 1) {
            pt = pts[i];
            if (minX > pt[0]) {
                minX = pt[0];
            }
            if (maxX < pt[0]) {
                maxX = pt[0];
            }
            if (minY > pt[1]) {
                minY = pt[1];
            }
            if (maxY < pt[1]) {
                maxY = pt[1];
            }
        }
        bounds.l = minX;
        bounds.t = minY;
        bounds.r = maxX;
        bounds.b = maxY;
    }

    function setBounds(shapeData, bounds, matrices, strokes, data) {
        var arr = [];
        var i, len = matrices.length;
        for (i = 0; i < len; i += 1) {
            matrices[i].getKeys(arr);
        }
        var shapeProp;
        if (shapeData.ty === 'sh') {
            shapeProp = PropertyFactory.getShapeProp(data, shapeData, 4, [], []);
        } else if (shapeData.ty === 'rc') {
            shapeProp = PropertyFactory.getShapeProp(data, shapeData, 5, [], []);
        } else if (shapeData.ty === 'el') {
            shapeProp = PropertyFactory.getShapeProp(data, shapeData, 6, [], []);
        }
        shapeProp.getKeys(arr);
        var j, jLen = arr.length, matr = new Matrix();
        for (j = 0; j < jLen; j += 1) {
            data.globalData.frameId += 1;
            data.comp.renderedFrame = arr[j];
            matr.reset();
            for (i = 0; i < len; i += 1) {
                matrices[i].getValue();
                matr.transform(matrices[i].v.props[0], matrices[i].v.props[1], matrices[i].v.props[2], matrices[i].v.props[3], matrices[i].v.props[4], matrices[i].v.props[5]);
            }
            if (shapeProp.k) {
                shapeProp.getValue();
            }
            var points = shapeProp.v;
            var k, kLen = points.v.length;
            for (k = 0; k < kLen - 1; k += 1) {
                getBoundingBox(matr.applyToPointArray(points.v[k][0], points.v[k][1]), matr.applyToPointArray(points.o[k][0], points.o[k][1]), matr.applyToPointArray(points.i[k + 1][0], points.i[k + 1][1]), matr.applyToPointArray(points.v[k + 1][0], points.v[k + 1][1]), bounds);
            }
            getBoundingBox(matr.applyToPointArray(points.v[k][0], points.v[k][1]), matr.applyToPointArray(points.o[k][0], points.o[k][1]), matr.applyToPointArray(points.i[0][0], points.i[0][1]), matr.applyToPointArray(points.v[0][0], points.v[0][1]), bounds);
        }
        len = strokes.length;
        arr = [];
        for (i = 0; i < len; i += 1) {
            strokes[i].getKeys(arr);
        }
        jLen = arr.length;
        var maxStroke = 0;
        for (j = 0; j < jLen; j += 1) {
            data.globalData.frameId += 1;
            data.comp.renderedFrame = arr[j];
            for (i = 0; i < len; i += 1) {
                if (strokes[i].k) {
                    strokes[i].getValue();
                }
                maxStroke = strokes[i].v > maxStroke ? strokes[i].v :  maxStroke;
            }
        }
        if (maxStroke) {
            bounds.t -= maxStroke / 2;
            bounds.l -= maxStroke / 2;
            bounds.b += maxStroke / 2;
            bounds.r += maxStroke / 2;
        }
        bounds.t = Math.floor(bounds.t);
        bounds.l = Math.floor(bounds.l);
        bounds.b = Math.ceil(bounds.b);
        bounds.r = Math.ceil(bounds.r);
    }
    

    function completeShapes(arr, bounds, matrices, strokes, data) {
        var i, len = arr.length;
        var j, jLen;
        var matr = [];
        var strk = [];
        matr = matr.concat(matrices);
        strk = strk.concat(strokes);
        for (i = len - 1; i >= 0; i -= 1) {
            if (arr[i].ty === 'sh' || arr[i].ty === 'el' || arr[i].ty === 'rc') {
                setBounds(arr[i], bounds, matr, strk, data);
            } else if (arr[i].ty === 'gr') {
                completeShapes(arr[i].it, bounds, matr, strk, data);
            } else if (arr[i].ty === 'tr') {
                matr.push(PropertyFactory.getProp(data, arr[i], 2, 0, []));
            } else if (arr[i].ty === 'st') {
                strk.push(PropertyFactory.getProp(data, arr[i].w, 0, 0, []));
            }
        }
    }
    
    function getShapeBounds(data) {
        data.bounds = {
            l: 999999,
            t: 999999,
            b: -999999,
            r: -999999
        };
        completeShapes(data.shapes, data.bounds, [], [], {data: {st: 0}, globalData: {frameId: 0}, comp: {renderedFrame: -1}});
    }
    
    
    function exportShape(layerInfo, layerOb, frameRate, isText) {
        var shapes = [], contents = layerInfo.property('Contents');
        layerOb.shapes = shapes;
        iterateProperties(contents, shapes, frameRate, isText);
        /*if (!isText) {
            getShapeBounds(layerOb);
        }*/
        getShapeBounds(layerOb);
    }
    
    ob.exportShape = exportShape;
    
    return ob;
}());