///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'jimu/BaseWidgetSetting',
  'dijit/_WidgetsInTemplateMixin',
  'jimu/dijit/SimpleTable',
  'dojo/dom',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/query',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dijit/form/Select',
  'dijit/form/TextBox',
  'dijit/form/ValidationTextBox',
  'dijit/form/RadioButton',
  'dijit/registry',
  'jimu/utils',
  'jimu/LayerInfos/LayerInfos',
  'jimu/dijit/Message'
],
  function(declare, BaseWidgetSetting, _WidgetsInTemplateMixin, SimpleTable, dom, domConstruct, on, query, lang, array, Select, TextBox, ValidationTextBox, RadioButton, registry, utils, LayerInfos, Message) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      //these two properties is defined in the BaseWidget
      baseClass: 'jimu-widget-map-filter',

      groupCounter: 0,
      groupLayerContainer: [],
      groupLayerName: [],
      groupLayerDesc: [],
      layerCounter: 0,
      layerList: null,

      postCreate: function() {
        this.inherited(arguments);
      },

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        this.groupLayerContainer = [];
        this.groupLayerName = [];
        this.groupLayerDesc = [];
        this.createMapLayerList();
      },

      getConfig: function() {
        var validGroups = this.validateNoGroups();
        var validGroupsNames = this.validateNoGroupsName();
        var validTables = this.validateTableRows();

        if(validGroups && validGroupsNames && validTables) {
          this.config.groups = [];
          array.forEach(this.groupLayerName, lang.hitch(this, function(groupName, i) {
            if(groupName !== null) {
              if(this.groupLayerContainer[i] !== null) {
                var groupObj = {};
                groupObj.name = utils.sanitizeHTML(groupName.value);
                groupObj.desc = utils.sanitizeHTML(this.groupLayerDesc[i].value);
                groupObj.layers = [];

                var result = array.forEach(this.groupLayerContainer[i].getRows(), lang.hitch(this, function(row) {
                  var layerStruct = {};
                  if(typeof(row.domainCol) !== 'undefined') {
                    layerStruct.layer = row.layerCol.value;
                    layerStruct.field = row.fieldCol.value;
                    if(row.domainCol.checked) {
                      layerStruct.useDomain = row.domainCol.value;
                    } else {
                      layerStruct.useDomain = '';
                    }
                  } else {
                    layerStruct.layer = row.layerCol.value;
                    layerStruct.field = row.fieldCol.value;
                    layerStruct.useDomain = '';
                  }

                  groupObj.layers.push(layerStruct);
                }));
                this.config.groups.push(groupObj);
              }
            }
          }));
          return this.config;
        } else {
          return false;
        }

      },

      createMapLayerList: function() {
        LayerInfos.getInstance(this.map, this.map.itemInfo)
          .then(lang.hitch(this, function(operLayerInfos) {
            console.log(operLayerInfos);
            if(operLayerInfos._layerInfos && operLayerInfos._layerInfos.length > 0) {
                this.layerList = operLayerInfos._layerInfos;
                if(this.config.groups.length > 0) {
                  array.forEach(this.config.groups, lang.hitch(this, function(group) {
                    this.createGroupBlock({group: group});
                  }));
                } else {
                  this.createGroupBlock({group: null});
                }
            }
          }));
      },

      createGroupBlock: function(pParam) {
        this.groupCounter++;

        var dsNode = domConstruct.create("div",{
          id: 'grpDiv_' + this.groupCounter,
          'class': 'group-block'
        });
        domConstruct.place(dsNode, this.layerMappingBlock);

        var addNameLabelNode = domConstruct.create("a",{
          id: 'addGroupNameLabel_' + this.groupCounter,
          'class': 'group-block-add-layer',
          innerHTML: 'Group Name:'
        });
        domConstruct.place(addNameLabelNode, dom.byId('grpDiv_' + this.groupCounter));

        var addNameNode = domConstruct.create("div",{
          id: 'addGroupName_' + this.groupCounter
        });
        domConstruct.place(addNameNode, dom.byId('addGroupNameLabel_' + this.groupCounter));

        var addDescLabelNode = domConstruct.create("a",{
          id: 'addGroupNameLabel_' + this.groupCounter,
          innerHTML: 'Description:'
        });
        domConstruct.place(addDescLabelNode, dom.byId('addGroupNameLabel_' + this.groupCounter));

        var addNameNode = domConstruct.create("div",{
          id: 'addGroupDesc_' + this.groupCounter
        });
        domConstruct.place(addNameNode, dom.byId('addGroupNameLabel_' + this.groupCounter));

        var deleteNameNode = domConstruct.create("div",{
          id: 'addGroupDelete_' + this.groupCounter,
          'class': 'group-block-delete'
        });
        var deleteAction = on(deleteNameNode, "click", lang.hitch(this, function(evt) {
          deleteAction.remove();
          this.removeGroup(deleteNameNode.id);
        }));
        domConstruct.place(deleteNameNode, dom.byId('grpDiv_' + this.groupCounter));
        dom.byId('addGroupDelete_' + this.groupCounter).innerHTML = "delete";

        var groupName = '';
        var groupDesc = '';
        if(typeof(pParam.group) !== 'undefined' && pParam.group !== null) {
          groupName = pParam.group.name;
          groupDesc = pParam.group.desc;
        }

        var txtGroupName = new ValidationTextBox({
            name: "txtGroupName",
            value: groupName,
            'class': 'groupName-textbox',
            placeHolder: this.nls.inputs.groupName,
            required: "true"
        }, dom.byId('addGroupName_' + this.groupCounter));
        this.groupLayerName.push(txtGroupName);

        var txtGroupDesc = new TextBox({
            name: "txtGroupDesc",
            value: groupDesc,
            'class': 'groupName-Desctextbox',
            placeHolder: this.nls.inputs.groupDesc
        }, dom.byId('addGroupDesc_' + this.groupCounter));
        this.groupLayerDesc.push(txtGroupDesc);

        this.createTableObject(pParam);

        var addLayerNode = domConstruct.create("div",{
          id: 'addLyrDiv_' + this.groupCounter,
          'class': 'jimu-btn group-block-add-layer'
        });
        this.own(on(addLayerNode, "click", lang.hitch(this, function(evt) {
          this.addLayerRow(addLayerNode.id);
        })));
        domConstruct.place(addLayerNode, dom.byId('grpDiv_' + this.groupCounter));
        dom.byId('addLyrDiv_' + this.groupCounter).innerHTML = this.nls.buttons.addLayer;

      },

      createTableObject: function(pParam) {
        var fields = null;
        fields = [{
          name: "layerCol",
          title: this.nls.tables.layer,
          "class": "label",
          type: "empty"
        }, {
          name: "fieldCol",
          title: this.nls.tables.field,
          "class": "label",
          type: "empty"
        }, {
          name: "domainCol",
          title: this.nls.tables.domain,
          "class": "label",
          type: "empty",
          width: "150px"
        }, {
          name: "actions",
          title: this.nls.tables.action,
          type: "actions",
          actions: ["delete"],
          width: "125px"
        }];

        var args = {
          fields: fields,
          'class': 'layer-tables'
        };
        var layerTable = new SimpleTable(args);
        layerTable.placeAt(dom.byId('grpDiv_' + this.groupCounter));
        this.groupLayerContainer.push(layerTable);

        if(typeof(pParam.group) !== 'undefined' && pParam.group !== null) {
          array.forEach(pParam.group.layers, lang.hitch(this, function(layer) {
            this.addLayerRow(dom.byId('grpDiv_' + this.groupCounter).id, layer);
          }));
        } else {
          this.addLayerRow(dom.byId('grpDiv_' + this.groupCounter).id, pParam);
        }

        //this.createLayerSelection();
      },

      addLayerRow: function(pBlock, pParam) {
        var numPart = pBlock.substring(pBlock.indexOf('_')+1);
        var result = this.groupLayerContainer[numPart-1].addRow({});
        if (result.success && result.tr) {
          var tr = result.tr;
          this.createLayerSelection(tr, pParam, numPart);
          // if (domClass.contains(this.btnOk, 'jimu-state-disabled')) {
          //   html.removeClass(this.btnOk, 'jimu-state-disabled');
          // }
        }
      },

      createLayerSelection: function(tr, pParam, pCounter) {
        var ctlLayerList = [];
        array.forEach(this.layerList, lang.hitch(this, function(layer) {
          if(layer.originOperLayer.layerType !== 'ArcGISTiledMapServiceLayer') {
          var lryObject = {};
          lryObject.value = layer.id;
          lryObject.label = layer.title;
          lryObject.selected = false;
          ctlLayerList.push(lryObject);
          }
        }));

        var td = query('.simple-table-cell', tr)[0];
        if (td) {
          var lyrSelect = new Select({
            options: ctlLayerList,
          }).placeAt(td);

          lyrSelect.startup();
          tr.layerCol = lyrSelect;
          this.own(on(lyrSelect, "change", lang.hitch(this, function(val) {
            this.createFieldSelection(val, tr, pParam, pCounter);
          })));

          if(typeof(pParam) !== 'undefined') {
            lyrSelect.set('value', pParam.layer);
          }

        }

        this.createFieldSelection(lyrSelect.value, tr, pParam, pCounter);

      },

      createFieldSelection: function(pLayer, pTR, pParam, pCounter) {
        var ctlfieldList = [];
        array.forEach(this.layerList, lang.hitch(this, function(layer) {
          if(layer.id === pLayer) {
            array.forEach(layer.layerObject.fields, lang.hitch(this, function(field) {
              var fieldObject = {};
              fieldObject.value = field.name;
              fieldObject.label = field.alias;
              fieldObject.selected = false;
              ctlfieldList.push(fieldObject);
            }));
          }
        }));

        var td = query('.simple-table-cell', pTR)[1];
        if (td) {
          domConstruct.empty(td);
          var fieldSelect = new Select({
            options: ctlfieldList
          }).placeAt(td);

          fieldSelect.startup();
          pTR.fieldCol = fieldSelect;

          this.own(on(fieldSelect, "change", lang.hitch(this, function(val) {
            this.domainRadio({layer: pLayer, field: val, row: pTR, param: pParam, counter: pCounter});
          })));

          if(typeof(pParam) !== 'undefined') {
            fieldSelect.set('value', pParam.field);
          }
        }
        this.domainRadio({
          layer: pLayer,
          field: fieldSelect.value,
          row: pTR,
          param: pParam,
          counter: pCounter
        });

      },

      domainRadio: function(pParam) {
        array.forEach(this.layerList, lang.hitch(this, function(layer) {
          if(layer.id === pParam.layer) {
            array.forEach(layer.layerObject.fields, lang.hitch(this, function(field) {
              if(field.name === pParam.field) {
                if(typeof(field.domain) !== 'undefined') {
                  if(field.domain.type === 'codedValue') {
                    var td = query('.simple-table-cell', pParam.row)[2];
                    if (td) {
                      var content = query('.dijit', td)[0];
                      if(content){
                        existRadio = registry.byNode(content);
                        dijit.byId(existRadio.id).destroyRecursive();
                      }
                      domConstruct.empty(td);
                      var domainRadio = new RadioButton({
                        name: 'useDomain' + pParam.counter
                      }).placeAt(td);

                      domainRadio.startup();
                      pParam.row.domainCol = domainRadio;

                      if(typeof(pParam) !== 'undefined') {
                        if(typeof(pParam.param) !== 'undefined') {
                          if(pParam.param.useDomain !== '') {
                            domainRadio.set('value', pParam.param.useDomain);
                          }
                        }
                      }
                    }
                  }
                } else {
                  var row = pParam.row;
                  if(typeof(row.domainCol) !== 'undefined') {
                    row.domainCol.value = '';
                  }
                  var td = query('.simple-table-cell', pParam.row)[2];
                  if (td) {
                    var content = query('.dijit', td)[0];
                    if(content){
                      existRadio = registry.byNode(content);
                      dijit.byId(existRadio.id).destroyRecursive();
                    }
                  }
                  //domConstruct.empty(td);


                }
              }
            }));
          }
        }));

      },


      validateNoGroups: function(){
        var validForm = false;
        var message = this.nls.errors.noGroups;
        array.forEach(this.groupLayerName, lang.hitch(this, function(groupName) {
          if(groupName !== null) {
            validForm = true;
          }
        }));
        if(!validForm) {
          new Message({
            message : message
          });
          return false;
        } else {
          return true;
        }
      },

      validateNoGroupsName: function(){
        var validForm = true;
        var message = this.nls.errors.noGroupName;
        array.forEach(this.groupLayerName, lang.hitch(this, function(groupName) {
          if(groupName !== null) {
            if(!groupName.get('value')) {
              new Message({
                message : message
              });
              validForm = false;
            }
          }
        }));
        return validForm;
      },

      validateTableRows: function() {
        var validForm = true;
        array.forEach(this.groupLayerContainer, lang.hitch(this, function(group) {
        if(group !== null) {
          if((group.getRows()).length <= 0) {
            new Message({
              message : this.nls.errors.noRows
            });
            validForm = false;
          }
        }
        }));
        return validForm;
      },

      removeGroup: function(pBlock) {
        var numPart = pBlock.substring(pBlock.indexOf('_')+1);
        this.groupLayerContainer[numPart-1] = null;
        this.groupLayerName[numPart-1] = null;
        this.groupLayerDesc[numPart-1] = null;
        dijit.byId('addGroupName_' + numPart).destroyRecursive(true);
        dijit.byId('addGroupDesc_' + numPart).destroyRecursive(true);
        domConstruct.destroy(dom.byId('addGroupDelete_' + numPart));
        domConstruct.destroy(dom.byId('addLyrDiv_' + numPart));
        domConstruct.destroy(dom.byId('grpDiv_' + numPart));
      }

    });
  });