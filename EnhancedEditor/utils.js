/*
Copyright ©2014 Esri. All rights reserved.

TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
Unpublished material - all rights reserved under the
Copyright Laws of the United States and applicable international
laws, treaties, and conventions.

For additional information, contact:
Attn: Contracts and Legal Department
Environmental Systems Research Institute, Inc.
380 New York Street
Redlands, California, 92373
USA

email: contracts@esri.com
*/

define([
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-construct',
  'esri/geometry/Extent'
], function(lang, array, domConstruct, Extent) {

  var mo = {};

  mo.checkIfFieldAliasAlreadyExists = function(origText, alias){
    var strArray = origText.split(",");
    return strArray.indexOf(alias) >= 0 ;
  };

  mo.pointToExtent = function (map, point, toleranceInPixel) {
    var pixelWidth = map.extent.getWidth() / map.width;
    var toleranceInMapCoords = toleranceInPixel * pixelWidth;
    return new Extent(point.x - toleranceInMapCoords,
                      point.y - toleranceInMapCoords,
                      point.x + toleranceInMapCoords,
                      point.y + toleranceInMapCoords,
                      map.spatialReference);
  };

  mo.createPresetFieldContentNode = function (fieldInfo) {
    var node = null;
    if (fieldInfo.type === "esriFieldTypeDate") {
      node = domConstruct.create("div", {
        innerHTML: lang.replace(
          "<input class='dijitReset dijitInputField dijitInputInner' name='{replace}' type='date'/>",
          { replace: fieldInfo.fieldName }),
        "class": "dijitReset atiField dijitTextBox"
      });
    } else {
      if (fieldInfo.domain) {
        // todo: when domain is not codedValue type
        // that is when the domain.type = codedValue
        var domainValues = fieldInfo.domain.codedValues;

        node = domConstruct.create("select", {
          "class": "dijitReset atiField dijitTextBox dijitInputField dijitInputInner", "name": fieldInfo.fieldName,
        });
          //{ "class": "dijitReset atiField dijitTextBox dijitInputInner", "name": fieldInfo.fieldName });
        // select options
        array.forEach(domainValues, function (dv) {
          domConstruct.place(lang.replace(
            "<option value='{replace}'>{replace}</option>",
            { replace: dv.name }), node); // or dv.code?
        });
      } else {
        switch (fieldInfo.type) {
          case "esriFieldTypeString":
            node = domConstruct.create("div", {
              innerHTML: lang.replace(
                "<input class='dijitReset dijitInputField dijitInputInner' name='{replace}' type='text'/>",
                { replace: fieldInfo.fieldName }),
              "class": "dijitReset atiField dijitTextBox"
            });
            break;
            // todo: check for more types
          case "esriFieldTypeSmallInteger":
          case "esriFieldTypeInteger":
          case "esriFieldTypeLong":
          case "esriFieldTypeDouble":
            node = domConstruct.create("div", {
              innerHTML: lang.replace(
                "<input class='dijitReset dijitInputField dijitInputInner' name='{replace}' type='number'/>",
                { replace: fieldInfo.fieldName }),
              "class": "dijitReset atiField dijitTextBox"
            });
            break;
          default:
            node = domConstruct.create("div",
              { "class": "dijitReset atiField dijitTextBox", innerHTML: "N/A" });
            break;
        }
      }
    }
    return node;
  };

  mo.filterOnlyUpdatedAttributes = function (attributes, origAttributes) {
    if (!attributes || attributes.length < 1 ||
        !origAttributes || origAttributes.length < 1) {
      return null;
    }

    var updatedAttrs = {};
    for (var prop in attributes) {
      if (attributes.hasOwnProperty(prop) &&
        attributes[prop] !== origAttributes[prop]) {
        updatedAttrs[prop] = attributes[prop];
      }
    }

    return updatedAttrs;
  };

  mo.getFieldInfosFromWebmap = function(layerId, jimuLayerInfos) {
    // summary:
    //   get fieldInfos from web map.
    // description:
    //   return null if fieldInfos has not been configured.
    var fieldInfos = null;
    var jimuLayerInfo = jimuLayerInfos.getLayerInfoByTopLayerId(layerId);
    if(jimuLayerInfo) {
      var popupInfo = jimuLayerInfo.getPopupInfo();
      if(popupInfo && popupInfo.fieldInfos) {
        fieldInfos = lang.clone(popupInfo.fieldInfos);
      }
    }
    return fieldInfos;
  };

  mo.isObjectEmpty = function (obj) {
    if (obj) {
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          return false;
        }
      }
      return true;
    }
    return true; //return true if obj is null
  };

  return mo;
});