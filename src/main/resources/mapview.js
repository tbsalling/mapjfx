/*
   Copyright 2015 Peter-Josef Meisch (pj.meisch@sothawo.com)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var layersOSM = new ol.layer.Group({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
      })
    ]
  });

var layersMQ = new ol.layer.Group({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.MapQuest({layer: 'osm'})
      })
    ]
  });

// to store the marker names with the overlays to be able to remove them
var markerOverlays = {};

/*******************************************************************************************************************
  map and handlers
 */
var map = new ol.Map({
    /*
    controls: [
        new ol.control.Zoom({
            zoomInLabel: '+',
            // en-dash instead of standard \u2212 minus, this renders as '2' since ol 3.1.1
            zoomOutLabel: '\u2013'
        }),
        new ol.control.Attribution
    ],
    */
    target: 'map',
    layers: layersOSM,
    view: new ol.View({
        zoom: 1
    })
});

map.on('singleclick', function(evt){
  var coordinate = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
    // lat/lon reversion
    app.singleClickAt(coordinate[1], coordinate[0]);
});

var anchorsPatched = false;
map.on('postrender', function(evt) {
  if(!anchorsPatched) {
  var anchors = document.getElementById('map').getElementsByTagName('a');
        for(var i = 0; i < anchors.length; ++i) {
            var anchor = anchors[i];
            href = anchor.href;
            // only patch if not already a javascript link
            if(href && href.lastIndexOf('javascript', 0) !== 0) {
              app.debug('patching anchor for ' + href);
              anchor.href='javascript:app.showLink("' + href +'");';
              anchorsPatched =true;
            }
        }
 }
});

/*******************************************************************************************************************
  view and handlers
 */
var view = map.getView();
view.on('change:center', function(evt) {
    center = ol.proj.transform(evt.target.get('center'), 'EPSG:3857', 'EPSG:4326');
    // lat/lon reversion
    app.centerMovedTo(center[1], center[0]);
});
view.on('change:resolution', function(evt) {
    app.zoomChanged(view.getZoom());
});

/*******************************************************************************************************************
  functions
 */
function setCenter(lat, lon, animationDuration) {
    // transform uses x/y coordinates, thats lon/lat
    var newCenter = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857')
    var oldCenter = view.getCenter();
    if(oldCenter && animationDuration > 1) {
        var anim = ol.animation.pan({
            duration: animationDuration,
            source: oldCenter
        });
        map.beforeRender(anim);
    }
    view.setCenter(newCenter);
}

function setZoom(zoom, animationDuration) {
    if(zoom != view.getZoom()) {
        var res = view.getResolution();
        if(res && animationDuration > 1) {
            var anim = ol.animation.zoom({
                resolution: res,
                duration: animationDuration
            });
            map.beforeRender(anim);
        }
    view.setZoom(zoom);
    }
}

function setMapType(newType) {
// rest the patched flag; the new layer can have different attributions
    anchorsPatched = false;
    if(newType == 'OSM') {
        map.setLayerGroup(layersOSM);
    } else if (newType == 'MAPQUEST_OSM') {
        map.setLayerGroup(layersMQ);
    }
}

function setExtent(minLat, minLon, maxLat, maxLon, animationDuration) {
    // lat/lon reversion
    var extent = ol.proj.transformExtent([minLon, minLat, maxLon, maxLat], 'EPSG:4326', 'EPSG:3857');
    if(animationDuration > 1) {
        var animPan = ol.animation.pan({
            duration: animationDuration,
            source: view.getCenter()
        });
        var animZoom = ol.animation.zoom({
            resolution: view.getResolution(),
            duration: animationDuration
        });
        map.beforeRender(animPan, animZoom);
    }
    view.fitExtent(extent, map.getSize());
}

function addMarkerWithURL(name, url, latitude, longitude, offsetX, offsetY) {
    var img = document.getElementById(name);
    if(!img) {
        var markers = document.getElementById('markers');
        img = document.createElement('img');
        img.setAttribute('id', name);
        img.setAttribute('alt', name);

        // create an image that does the rest when finished loading
        var newImg = new Image;
        newImg.onload = function() {
            app.debug('image loaded from ' + url);
            img.src = this.src;

            markers.appendChild(img);

            var overlay = new ol.Overlay({
                offset: [offsetX, offsetY],
                position: ol.proj.transform([longitude,latitude], 'EPSG:4326', 'EPSG:3857'),
                element: img
            });
            markerOverlays[name] = overlay;
            map.addOverlay(overlay);
        };
        newImg.onerror = function() {
            app.debug('image load error');
        };
        newImg.src = url;
    }
}

function removeMarker(name) {
    var overlay = markerOverlays[name];
    if(overlay) {
        map.removeOverlay(overlay);
        delete markerOverlays[name];
    }
    var img = document.getElementById(name);
    if(img){
       img.parentNode.removeChild(img);
    }
}

function moveMarker(name,latitude,longitude) {
    var overlay = markerOverlays[name];
    if(overlay) {
        overlay.setPosition(ol.proj.transform([longitude,latitude], 'EPSG:4326', 'EPSG:3857'));
    }
}
