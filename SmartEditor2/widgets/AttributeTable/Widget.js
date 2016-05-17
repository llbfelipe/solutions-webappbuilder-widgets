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
    'dojo/_base/html',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'dijit/layout/TabContainer',
    "dijit/layout/ContentPane",
    'jimu/utils',
    'jimu/dijit/Message',
    "dojo/Deferred",
    "dojo/promise/all",
    "esri/layers/FeatureLayer",
    'dojo/_base/lang',
    "dojo/on",
    'dojo/touch',
    'dojo/topic',
    'dojo/aspect',
    "dojo/_base/array",
    "dojo/query",
    'jimu/dijit/LoadingIndicator',
    './_ResourceManager',
    // './_TableFunctionController',
    './utils'
  ],
  function(
    declare,
    html,
    _WidgetsInTemplateMixin,
    BaseWidget,
    TabContainer,
    ContentPane,
    utils,
    Message,
    Deferred,
    all,
    FeatureLayer,
    lang,
    on,
    touch,
    topic,
    aspect,
    array,
    domQuery,
    LoadingIndicator,
    _ResourceManager,
    attrUtils) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
      /* global apiUrl */
      name: 'AttributeTable',
      baseClass: 'jimu-widget-attributetable',
      normalHeight: 0,
      openHeight: 0,
      arrowDivHeight: null,

      _relatedDef: null,

      _resourceManager: null,

      _activeLayerInfoId: null,

      // TODO: layerType: FeatureLayer,  RelationshipTable
      _layerTypes: {
        FEATURELAYER: 'FeatureLayerTable',
        RELATIONSHIPTABLE: 'RelationshipTable'
      },

      postMixInProperties: function() {
        this.nls.features = this.nls.features || 'features';
      },

      postCreate: function() {
        this.inherited(arguments);
        utils.loadStyleLink("dgrid", apiUrl + "dgrid/css/dgrid.css");
        this._loadInfoDef = null;
        this.AttributeTableDiv = null;

        this._delayedLayerInfos = [];
        this.layerTabPages = [];
        // one layer may be have multiple relationships, so we use key-value to store relationships
        this.relationTabPagesSet = {};

        this.tabContainer = null;

        this.moveMode = false;
        this.moveY = 0;
        this.previousDomHeight = 0;
        this.noGridHeight = 0;
        this.bottomPosition = 0;
        this.layerTabPagesIndex = -1;

        this.showing = false;

        // set initial position
        this.openHeight = this.normalHeight = this._getNormalHeight();
        this.arrowDivHeight = 0;

        // event handlers on draging
        this._dragingHandlers = [];

        this._activeTable = null;
        this._activeTableHandles = [];

        this._createUtilitiesUI();

        this._resourceManager = new _ResourceManager({
          map: this.map,
          nls: this.nls
        });
        this._resourceManager.setConfig(this.config);

        this.own(topic.subscribe('changeMapPosition', lang.hitch(this, this._onMapPositionChange)));
        attrUtils.readLayerInfosObj(this.map).then(lang.hitch(this, function(layerInfosObj) {
          if (!this.domNode || !layerInfosObj) {
            return;
          }
          this.own(on(
            layerInfosObj,
            'layerInfosIsShowInMapChanged',
            lang.hitch(this, this.onLayerInfosIsShowInMapChanged)));
          this.own(layerInfosObj.on(
            'layerInfosChanged',
            lang.hitch(this, this.onLayerInfosChanged)));
        }));
      },

      _createUtilitiesUI: function() {
        this._createArrowUI();

        this._createBarUI();
      },

      _createArrowUI: function() {
        this.arrowDiv = html.create("div");
        html.addClass(this.arrowDiv, "jimu-widget-attributetable-move");
        html.create('div', {
          'class': "jimu-widget-attributetable-thumb"
        }, this.arrowDiv);
        html.place(this.arrowDiv, this.domNode);

        if (!this.arrowDivHeight) {
          var arrowDivBox = html.getMarginBox(this.arrowDiv);
          this.arrowDivHeight = arrowDivBox && arrowDivBox.h ? arrowDivBox.h : 7;
        }

        this.own(on(this.arrowDiv, 'mousedown', lang.hitch(this, this._onDragStart)));
        this.own(on(this.arrowDiv, touch.press, lang.hitch(this, this._onDragStart)));
      },

      _isOnlyTable: function() {
        return this.closeable || !this.isOnScreen;
      },

      _createBarUI: function() {
        if (!this._isOnlyTable()) {
          this.switchBtn = html.create("div");
          html.addClass(this.switchBtn, "jimu-widget-attributetable-switch");
          html.place(this.switchBtn, this.domNode);
          this.own(on(this.switchBtn, 'click', lang.hitch(this, this._switchTable)));
        }
      },

      _processOpenBarUI: function() {
        if (!this._isOnlyTable()) {
          html.removeClass(this.switchBtn, 'close');
          html.addClass(this.switchBtn, 'open');
          html.setAttr(this.switchBtn, 'title', this.nls.closeTableTip);
        }
      },

      _processCloseBarUI: function() {
        if (!this._isOnlyTable()) {
          html.removeClass(this.switchBtn, 'open');
          html.addClass(this.switchBtn, 'close');
          html.setAttr(this.switchBtn, 'title', this.nls.openTableTip);
        }
      },

      _switchTable: function() {
        if (!this.showing) {
          this._openTable();
        } else {
          this._closeTable();
        }
      },

      _openTable: function() {
        if (!this._loadInfoDef) {
          this._loadInfoDef = new Deferred();
          this.own(this._loadInfoDef);
          if (!this.loading) {
            this.loading = new LoadingIndicator();
          }
          this.loading.placeAt(this.domNode);
          this.loading.show();

          this._resourceManager.updateLayerInfoResources(true)
          .then(lang.hitch(this, function() {
            if (!this.domNode) {
              return;
            }

            this._init();
            this.showRefreshing(false);

            this.showing = true;
            this._loadInfoDef.resolve();
          }), lang.hitch(this, function(err) {
            console.error(err);
            this._loadInfoDef.reject(err);
          }));
        } else if (this._loadInfoDef && this._loadInfoDef.isFulfilled()) {
          this.showing = true;
          this._processDelayedLayerInfos();
          if (this._activeTable) {
            this._activeTable.active();
          }
        }

        this._changeHeight(this.openHeight);
        this._processOpenBarUI();
        return this._loadInfoDef;
      },

      _onCloseBtnClicked: function() {
        if (this.showing && this._isOnlyTable()) {
          this.widgetManager.closeWidget(this);
        } else if (this.showing) {
          this._closeTable();
        }

        if (this._activeTable) {
          this._activeTable.deactive();
        }
      },

      _closeTable: function() {
        this._changeHeight(0);
        this.showRefreshing(false);
        this._processCloseBarUI();
        // this._tableFunctionController.deactive();
        if (this._activeTable) {
          this._activeTable.deactive();
        }

        this.showing = false;

        // fix arrowDiv display bug on bottom when close table (only mobile)
        html.setStyle(this.arrowDiv, 'display', 'none');
        html.setStyle(this.domNode, 'overflow', 'hidden');
        setTimeout(lang.hitch(this, function() {
          html.setStyle(this.domNode, 'overflow', 'visible');
          html.setStyle(this.arrowDiv, 'display', 'block');
        }), 10);
      },

      _init: function() {
        this.initDiv();
        this._changeHeight(this.openHeight);
        this.resize();

        this.own(on(window.document, "mouseup", lang.hitch(this, this._onDragEnd)));
        this.own(on(window.document, "mousemove", lang.hitch(this, this._onDraging)));
        this.own(on(window.document, touch.move, lang.hitch(this, this._onDraging)));
        this.own(on(window.document, touch.release, lang.hitch(this, this._onDragEnd)));
      },

      _processDelayedLayerInfos: function() { // must be invoke after initialize this._layerInfos
        if (this._delayedLayerInfos.length > 0) {
          array.forEach(this._delayedLayerInfos, lang.hitch(this, function(delayedLayerInfo) {
            this._resourceManager.addLayerInfo(delayedLayerInfo);
          }));

          this._delayedLayerInfos = [];
        }
      },

      onLayerInfosIsShowInMapChanged: function() {
        if (this._activeTable) {
          this._activeTable.changeToolbarStatus();
        }
      },

      onLayerInfosChanged: function(layerInfo, changeType, layerInfoSelf) {
        if (!layerInfoSelf || !layerInfo) {
          return;
        }

        if ('added' === changeType) {
          layerInfoSelf.getSupportTableInfo().then(lang.hitch(this, function(supportTableInfo) {
            if (supportTableInfo.isSupportedLayer) {
              this._resourceManager.addLayerInfo(layerInfoSelf);
            }
          }));
        } else if ('removed' === changeType) {
          var selfId = layerInfoSelf.id;
          if (this.getExistLayerTabPage(selfId)) {
            this.layerTabPageClose(selfId, true);
          }
        }
      },

      destroy: function() {
        if (this._destroyed) {
          return;
        }
        var len, i;
        if (this.layerTabPages && this.layerTabPages.length > 0) {
          len = this.layerTabPages.length;
          for (i = 0; i < len; i++) {
            this.layerTabPages[i].destroy();
          }
          this.layerTabPages = null;
        }

        if (this.relationTabPagesSet) {
          for (var p in this.relationTabPagesSet) {
            if (this.relationTabPagesSet[p]) {
              this.relationTabPagesSet[p].destroy();
            }
          }
          this.relationTabPagesSet = null;
        }

        if (this.tabContainer) {
          this.tabContainer.destroy();
          this.tabContainer = null;
        }

        this.AttributeTableDiv = null;
        this._loadInfoDef = null;
        if (this._resourceManager) {
          this._resourceManager.empty();
        }
        this.inherited(arguments);
      },

      onOpen: function() {
        if (!this.showing && this._isOnlyTable()) {
          this._openTable();
        }
      },

      onClose: function() {
        if (this.showing) {
          this._closeTable();
        }
      },

      _changeHeight: function(h) {
        html.setStyle(this.domNode, "height", h + "px");
        if (this.tabContainer && this.tabContainer.domNode &&
          (h - this.arrowDivHeight >= 0)) {
          html.setStyle(
            this.tabContainer.domNode,
            "height",
            (h - this.arrowDivHeight) + "px"
          );
        }

        if (this._activeTable) {
          this._activeTable.changeHeight(h - this.noGridHeight);
        }

        topic.publish('changeMapPosition', {
          bottom: h + this.bottomPosition
        });

        if (h !== 0) {
          var minOpenHeight = this.arrowDivHeight;

          this.openHeight = (h >= minOpenHeight) ? h : this.normalHeight;
        }
      },

      _onMapPositionChange: function(pos) {
        if (isFinite(pos.left) && typeof pos.left === 'number') {
          if (window.isRTL) {
            html.setStyle(this.domNode, 'right', parseFloat(pos.left) + 'px');
          } else {
            html.setStyle(this.domNode, 'left', parseFloat(pos.left) + 'px');
          }
        }
        if (isFinite(pos.right) && typeof pos.right === 'number') {
          if (window.isRTL) {
            html.setStyle(this.domNode, 'left', parseFloat(pos.right) + 'px');
          } else {
            html.setStyle(this.domNode, 'right', parseFloat(pos.right) + 'px');
          }
        }

        if (this.tabContainer) {
          this.tabContainer.resize();
        }
      },

      setPosition: function(position) {
        this.position = position;
        if (this._isOnlyTable()) {
          this.bottomPosition = 0;
        } else {
          if ("bottom" in position) {
            this.bottomPosition = parseInt(position.bottom, 10);
          } else {
            this.bottomPosition = 0;
          }
        }
        if (!this.domNode.parentNode || this.domNode.parentNode.id !== window.jimuConfig.layoutId) {
          html.place(this.domNode, window.jimuConfig.layoutId);
          this.setInitialPosition(position);

          this.showRefreshing(false);
        }
        html.setStyle(this.domNode, "bottom", this.bottomPosition + "px");
        if (!this._resourceManager.isEmpty()) {
          setTimeout(lang.hitch(this, function() {
            var ngHeight = this._getGridTopSectionHeight();
            var domHeight = html.getStyle(this.domNode, 'height');
            if (ngHeight > 0) {
              this.noGridHeight = ngHeight;
            }
            if (domHeight > 0) {
              this._changeHeight(domHeight);
            }
          }), 20);
        }
      },

      _startQueryOnLayerTab: function(tabId) {
        var layerInfo = this._resourceManager.getLayerInfoById(tabId);
        var tabPage = this.getExistLayerTabPage(tabId);

        if (layerInfo && tabPage) {
          this.showRefreshing(true);
          this._resourceManager.getQueryTable(tabId, this.config.filterByMapExtent)
          .then(lang.hitch(this, function(result) {
            //prevent overwrite by another asynchronous callback
            if (this._activeLayerInfoId !== tabId || !result) {
              return;
            }
            //prevent overwrite by another asynchronous callback
            tabPage = this.getExistLayerTabPage(tabId);

            if (result.isSupportQuery) {
              var table = result.table;
              if (table.getParent() !== tabPage) {
                table.placeAt(tabPage);
              }

              this.setActiveTable(table, {
                h: this.openHeight - this.noGridHeight//,
              });
            } else {
              var tip = html.toDom('<div>' + this.nls.unsupportQueryWarning + '</div>');
              tabPage.set('content', tip);

              if (this._activeTable) {
                this._activeTable.changeToolbarStatus();
              }
            }
            this.showRefreshing(false);
          }), lang.hitch(this, function(err) {
            new Message({
              message: err.message || err
            });
            this.showRefreshing(false);
          }));
        }
      },

      _startQueryOnRelationTab: function(infoId, relationShipKey, selectedIds, originalInfoId) {
        var originalInfo = this._resourceManager.getLayerInfoById(originalInfoId);
        var tabPage = this.getExistLayerTabPage(infoId);
        if (!(originalInfo && originalInfo.layerObject) || !tabPage) {
          return;
        }

        this._resourceManager.getRelationTable(originalInfoId, relationShipKey)
        .then(lang.hitch(this, function(result) {
          //prevent overwrite by another asynchronous callback
          if (this._activeLayerInfoId !== infoId || !result) {
            return;
          }
          //prevent overwrite by another asynchronous callback
          tabPage = this.getExistLayerTabPage(infoId);

          if (result.isSupportQuery) {
            var table = result.table;
            if (table.getParent() !== tabPage) {
              table.placeAt(tabPage);
            }

            this.setActiveTable(table, {
              h: this.openHeight - this.noGridHeight,
              layer: originalInfo.layerObject,
              selectedIds: selectedIds
            });

          } else {
            var tip = html.toDom('<div>' + this.nls.unsupportQueryWarning + '</div>');
            tabPage.set('content', tip);

            if (this._activeTable) {
              this._activeTable.changeToolbarStatus();
            }
          }
          this.showRefreshing(false);
        }));
      },

      tabChanged: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          if (this.noGridHeight <= 0) {
            this.noGridHeight = this._getGridTopSectionHeight() + 5;
          }
          var params = this.tabContainer.selectedChildWidget.params;

          var layerType = params.layerType;
          var infoId = params.paneId;
          var relKey = params.relKey;

          if (layerType === this._layerTypes.FEATURELAYER && (this._activeLayerInfoId !== infoId ||
            params.oids)) {// change tab or the lasest operate is queryRelatedRecords
            this.setActiveTable(null);
            delete params.oids;
            this._activeLayerInfoId = infoId;
            this._startQueryOnLayerTab(infoId);
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            // need key and oids to judgement
            this.setActiveTable(null);
            var selectIds = params.oids;
            var originalInfoId = params.originalInfoId;
            this._activeLayerInfoId = infoId;
            this._startQueryOnRelationTab(infoId, relKey, selectIds, originalInfoId);
          }
        }
      },

      showRefreshing: function(refresh) {
        if (!this.loading) {
          return;
        }

        if (refresh) {
          this.loading.show();
        } else {
          this.loading.hide();
        }
      },

      _onDragStart: function(evt) {
        this.moveMode = true;
        this.moveY = evt.clientY;
        this.previousDomHeight = html.getStyle(this.domNode, "height");
        html.addClass(this.arrowDiv, "draging");

        this._dragingHandlers = this._dragingHandlers.concat([
          on(this.ownerDocument, 'dragstart', function(e) {
            e.stopPropagation();
            e.preventDefault();
          }),
          on(this.ownerDocumentBody, 'selectstart', function(e) {
            e.stopPropagation();
            e.preventDefault();
          })
        ]);
      },

      _onDraging: function(evt) {
        if (this.moveMode && (evt.clientY >= 125)) {
          var y = this.moveY - evt.clientY;
          this._changeHeight(y + this.previousDomHeight);
        }
      },

      _onDragEnd: function() {
        this.moveMode = false;
        html.removeClass(this.arrowDiv, "draging");

        var h = this._dragingHandlers.pop();
        while (h) {
          h.remove();
          h = this._dragingHandlers.pop();
        }
      },

      _getNormalHeight: function() {
        var h = document.body.clientHeight;
        return window.appInfo.isRunInMobile ? h / 2 : h / 3;
      },

      setInitialPosition: function() {
        // Attribute Table decide position by itself.
        html.setStyle(this.domNode, "top", "auto");
        html.setStyle(this.domNode, "left", "0px");
        html.setStyle(this.domNode, "right", "0px");
        html.setStyle(this.domNode, "position", "absolute");

        if (!this._isOnlyTable()) {
          if (this.config && this.config.initiallyExpand) {
            this._openTable();
          } else {
            this._closeTable();
          }
        } // else use openAtStart by widgetManager or controller
      },

      _bindActiveTableEvents: function (){
        var that = this;
        if (that._activeTable) {
          that._activeTableHandles.push(on(that._activeTable,
            'show-related-records', function(evt) {
              that._showRelatedRecords(evt);
            })
          );
          that._activeTableHandles.push(on(that._activeTable,
            'show-all-records', function(evt) {
              var page = that.getExistLayerTabPage(evt.layerInfoId);
              page.params.layerType = that._layerTypes.FEATURELAYER;
            }));
          that._activeTableHandles.push(on(that._activeTable,
            'row-click', function() {
              var tables = that._resourceManager.featureTableSet;
              for (var p in tables) {
                var t = tables[p];
                if (t !== that._activeTable) {
                  t.clearSelection(false);
                }
              }
            }));
        }
      },

      _unbindActiveTableEvents: function (){
        var that = this;
        var handlers = that._activeTableHandles;
        while(handlers.length > 0) {
          var h = handlers.pop();
          if (h && h.remove) {
            h.remove();
          }
        }
      },

      setActiveTable: function(table, options) {
        // this.own(on(this._tableFunctionController, 'click-close',
        //   lang.hitch(this, '_onCloseBtnClicked')));
        if (this._activeTable) {
          this._activeTable.cancelThread();
          this._activeTable.deactive();
          this._unbindActiveTableEvents();
        }
        if (table) {
          this._activeTable = table;
          this._activeTable.active();
          this._activeTable.changeHeight(options.h);
          if (!this._activeTable.tableCreated ||
            (this._activeTable.tableCreated && this._activeTable.matchingMap) ||
            (options.layer && options.selectedIds)) {// queryRecordsByRelationship
            if (options.layer && options.selectedIds) {
              this._activeTable.queryRecordsByRelationship(options);
            } else {
              this._activeTable.startQuery();
            }
          }
          this._bindActiveTableEvents();
          this._activeTable.changeToolbarStatus();
        }
      },

      initDiv: function() {
        this.AttributeTableDiv = html.create("div", {}, this.domNode);
        html.addClass(this.AttributeTableDiv, "jimu-widget-attributetable-main");

        var tabDiv = html.create("div");
        html.place(tabDiv, this.AttributeTableDiv);

        this.tabContainer = new TabContainer({
          style: "width: 100%;"
        }, tabDiv);
        html.setStyle(this.tabContainer.domNode, 'height', (this.normalHeight) + 'px');
        var configInfos = this._resourceManager.getConfigInfos();
        var len = configInfos.length;
        for (var j = 0; j < len; j++) {
          var configInfo = configInfos[j];
          if (configInfo.show) {
            var json = lang.clone(configInfo);
            var paneJson = {};

            paneJson.paneId = json.id;
            paneJson.title = json.name;
            paneJson.name = json.name;
            paneJson.layerType = this._layerTypes.FEATURELAYER;
            paneJson.style = "height: 100%; width: 100%; overflow: visible;";
            var cp = new ContentPane(paneJson);
            this.layerTabPages[j] = cp;
            this.tabContainer.addChild(cp);
          }
        }
        this.tabContainer.startup();

        if (len > 0) {
          // tabListWrapperHeight + tolerance
          this.noGridHeight = this._getGridTopSectionHeight() + 5;
        }
        // vertical center
        utils.setVerticalCenter(this.tabContainer.domNode);
        this.tabChanged();
        this.own(aspect.after(this.tabContainer, "selectChild", lang.hitch(this, this.tabChanged)));
      },

      getLayerInfoLabel: function(layerInfo) {
        var label = layerInfo.name || layerInfo.title;
        return label;
      },

      getLayerInfoId: function(layerInfo) {
        return layerInfo && layerInfo.id || "";
      },

      _getGridTopSectionHeight: function() {
        var tabPageWrapper = domQuery('.dijitTabPaneWrapper', this.domNode)[0];
        if (tabPageWrapper) {
          var widgetTop = html.position(this.domNode).y;
          var tabPaneTop = html.position(tabPageWrapper).y;
          return tabPaneTop - widgetTop;
        } else {
          return 0;
        }
      },

      _getLayerInfoByIdFromConfigJSON: function(id) {
        var configedInfos = array.filter(this.config.layerInfos, function(linfo) {
          return linfo.id === id;
        });
        return (configedInfos && configedInfos.length > 0) && configedInfos[0];
      },


      _showRelatedRecords: function() {
        var activeTable = this._activeTable;
        if (activeTable) {
          var layerInfo = activeTable.layerInfo;
          if (layerInfo && layerInfo.layerObject) {
            var _layer = layerInfo.layerObject;
            var ships = _layer.relationships;
            var objIds = activeTable.getSelectedRows();

            for (var i = 0, len = ships.length; i < len; i++) {
              this.addNewRelationTab(objIds, ships[i], layerInfo.id);
            }
          }
        }
      },

      addNewLayerTab: function(infoId) {
        var layerInfo = this._resourceManager.getLayerInfoById(infoId);
        if (!layerInfo) {
          return;
        }
        var page = this.getExistLayerTabPage(infoId);
        var json = {};
        json.title = this.getLayerInfoLabel(layerInfo);
        json.name = json.title;
        json.paneId = this.getLayerInfoId(layerInfo);
        json.closable = true;
        json.layerType = this._layerTypes.FEATURELAYER;
        if (page) {
          lang.mixin(page.params, json);
          this.onOpen();
          // this.tabContainer.selectChild(page);
        } else {
          if (!this._resourceManager.getConfigInfoById(layerInfo.id)) {
            this._resourceManager.addConfigInfo(layerInfo);
          }
          if (!this._resourceManager.getLayerInfoById(layerInfo.id)) {
            this._resourceManager.addLayerInfo(layerInfo);
          }
          this.onOpen();

          json.style = "height: 100%; width: 100%; overflow: visible";
          page = new ContentPane(json);
          this.layerTabPages.push(page);

          page.set("title", json.name);
          this.own(on(page, "close", lang.hitch(this, this.layerTabPageClose, json.paneId, true)));
          this.tabContainer.addChild(page);
        }
        this.tabContainer.selectChild(page);
      },

      addNewRelationTab: function(oids, relationShip, originalInfoId) {
        var lInfo = relationShip && relationShip.shipInfo;
        if (!lInfo) {
          return;
        }
        var page = this.getExistLayerTabPage(relationShip.shipInfo.id);

        var json = {};
        json.oids = oids;
        var paneTitle = lInfo.title || lInfo.name || relationShip.name;
        json.title = paneTitle;
        json.name = json.title;
        json.paneId = lInfo.id;
        json.relKey = relationShip._relKey;
        json.originalInfoId = originalInfoId;
        json.closable = true;
        json.layerType = this._layerTypes.RELATIONSHIPTABLE;

        if (page) {
          lang.mixin(page.params, json);
        } else {
          if (!this._resourceManager.getConfigInfoById(lInfo.id)) {
            this._resourceManager.addConfigInfo(lInfo);
          }
          if (!this._resourceManager.getLayerInfoById(lInfo.id)) {
            this._resourceManager.addLayerInfo(lInfo);
          }
          json.style = "height: 100%; width: 100%; overflow: visible";
          page = new ContentPane(json);
          this.layerTabPages.push(page);
          page.set("title", json.name);
          this.own(on(page, "close", lang.hitch(this, this.layerTabPageClose, json.paneId, true)));

          this.tabContainer.addChild(page);
        }
        this.tabContainer.selectChild(page);
      },

      onReceiveData: function(name, source, params) {
        /*jshint unused:vars*/
        if (params && params.target === "AttributeTable") {
          if (this._isOnlyTable()) {
            if (this.state === 'closed') {
              console.warn('Please open Attribute Table!');
              return;
            }
          }

          if (!this.showing) {
            this._openTable().then(lang.hitch(this, function() {
              var isInResources = !!this._resourceManager.getLayerInfoById(params.layer.id);
              if (!isInResources) {
                this._resourceManager.updateLayerInfoResources(false)
                .then(lang.hitch(this, function() {
                  this._addLayerToTable(params);
                }));
              } else {
                this._addLayerToTable(params);
              }
            }));
          } else {
            this._resourceManager.updateLayerInfoResources(false)
            .then(lang.hitch(this, function() {
              this._addLayerToTable(params);
            }));
          }
        }
      },

      _addLayerToTable: function(params) {
        var layer = null;
        if (!lang.getObject('layer.id', false, params)) {
          return;
        }
        var layerInfo = this._resourceManager.getLayerInfoById(params.layer.id);
        layerInfo.getLayerObject().then(lang.hitch(this, function(layerObject) {
          if (layerObject) {
            layerObject.id = params.layer.id;
            if (layerObject.loaded) {
              this.addNewLayerTab(layerInfo.id);
            } else {
              this.own(on(layerObject, "load",
                lang.hitch(this, this.addNewLayerTab, layerInfo.id)));
            }
          } else if (params.url) {
            layer = new FeatureLayer(params.url);
            this.own(on(layer, "load", lang.hitch(this, this.addNewLayerTab, layerInfo.id)));
          }
        }), lang.hitch(this, function(err) {
          new Message({
            message: err.message || err
          });
        }));
      },

      getExistLayerTabPage: function(paneId) {
        var len = this.layerTabPages.length;
        for (var i = 0; i < len; i++) {
          if (this.layerTabPages[i] && this.layerTabPages[i].get('paneId') === paneId) {
            return this.layerTabPages[i];
          }
        }
        return null;
      },

      layerTabPageClose: function(paneId, isRemoveChild) {
        var len = this.layerTabPages.length;
        var activeId = lang.getObject('_activeTable.layerInfo.id', false, this);
        if (activeId === paneId) {
          this.setActiveTable(null);
        }
        for (var i = 0; i < len; i++) {
          if (this.layerTabPages[i] && this.layerTabPages[i].paneId === paneId) {
            if (isRemoveChild === true) {
              this.tabContainer.removeChild(this.layerTabPages[i]);
            }
            if (this.layerTabPages && this.layerTabPages[i]) {
              this.layerTabPages[i].destroyRecursive();
              this.layerTabPages.splice(i, 1);
            }

            this._resourceManager.removeConfigInfo(paneId);
            this._resourceManager.removeLayerInfo(paneId);

            if (len === 1) {
              this.onClose();
              return;
            }  else if(paneId === this._activeLayerInfoId) {
              var layerIndex = len - 2;
              this.tabContainer.selectChild(this.layerTabPages[layerIndex]);
            }
            break;
          }
        }
      },

      _processRelatedRecordsFromPopup: function(layerInfo, featureIds) {
        if (layerInfo) {
          var defs = [];
          defs.push(layerInfo.getLayerObject());
          defs.push(layerInfo.getRelatedTableInfoArray());
          all(defs).then(lang.hitch(this, function(results) {
            if (results) {
              var layerObject = results[0];
              var relatedTableInfos = results[1];
              this._resourceManager.collectRelationShips(layerInfo, relatedTableInfos);
              var ships = layerObject.relationships;
              for (var i = 0, len = ships.length; i < len; i++) {
                this.addNewRelationTab(featureIds, ships[i], layerInfo.id);
              }
            }
          }));
        }
      },

      showRelatedRecordsFromPopup: function(layerInfo, featureIds) {
        if (!this.showing) {
          this._openTable().then(lang.hitch(this, function() {
            var isInResources = !!this._resourceManager.getLayerInfoById(layerInfo.id);
            if (!isInResources) {
              this._resourceManager.updateLayerInfoResources(false)
              .then(lang.hitch(this, function() {
                this._processRelatedRecordsFromPopup(layerInfo, featureIds);
              }));
            } else {
              this._processRelatedRecordsFromPopup(layerInfo, featureIds);
            }
          }));
        } else {
          this._resourceManager.updateLayerInfoResources(false)
          .then(lang.hitch(this, function() {
            this._processRelatedRecordsFromPopup(layerInfo, featureIds);
          }));
        }
      }
    });

    clazz.inPanel = false;
    clazz.hasUIFile = false;
    return clazz;
  });