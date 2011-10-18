// Copyright 2010 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview This file contains the dialog for exporting a project.  When
 * the user enters a project, its tests and details are loaded from the server
 * and displayed in the dialog.  If the user makes changes to the details and
 * wishes to save those changes the save button must be pressed.  It does not
 * automatically save user changes as they are made.
 *
 * The main functionality of this dialog is the ability to export the project
 * as Java WebDriver code.  It does this by translating the loaded project
 * information through the bite.webdriver and then sends the resulting output
 * files to the server.  The output files are then zipped, stored on the
 * server, and then downloaded to the user's machine.
 *
 * The script button follows the same process as the export button, but
 * produces a command line script created by RPF for the exported project.  The
 * script will unzip the exported project and move it to the correct location
 * within the client.
 *
 * @author jasonstredwick@google.com (Jason Stredwick)
 */


goog.provide('rpf.ExportDialog');

goog.require('bite.common.mvc.helper');
goog.require('bite.webdriver');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.format.JsonPrettyPrinter');
goog.require('goog.json');
goog.require('goog.ui.Dialog');
goog.require('rpf.Console.Messenger');
goog.require('rpf.DataModel');
goog.require('rpf.StatusLogger');
goog.require('rpf.soy.Dialog');



/**
 * Defines an export dialog used by RPF to export tests and projects to the
 * local machine as a zip file.  Each zip file will contain the translation
 * of the information in the selected format.
 * @param {function(Bite.Constants.UiCmds, Object, Event, function(Object)=)}
 *     onUiEvents The function to handle the specific event.
 * @constructor
 */
rpf.ExportDialog = function(onUiEvents) {
  /**
   * The project data loaded from the server.
   * @type {Object}
   * @private
   */
  this.data_ = null;

  /**
   * The dialog.
   * @type {goog.ui.Dialog}
   * @private
   */
  this.dialog_ = null;

  /**
   * Contains key elements within the dialog.
   * @type {!Object.<string, !Element>}
   * @private
   */
  this.elements_ = {};

  /**
   * Manages events that are constant through every state.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.handlersDynamic_ = null;

  /**
   * Manages a set of events that will change from state to state.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.handlersStatic_ = null;

  /**
   * Whether or not the dialog is ready for use.
   * @type {boolean}
   * @private
   */
  this.ready_ = false;

  /**
   * The function to handle the specific event.
   * @type {function(Bite.Constants.UiCmds, Object, Event, function(Object)=)}
   * @private
   */
  this.onUiEvents_ = onUiEvents;
};


/**
 * Ids for important elements.
 * @enum {string}
 * @private
 */
rpf.ExportDialog.Id_ = {
  ADD: 'export-add-class',
  EXPORT: 'export-button-export',
  GO: 'export-button-go',
  JAVA_PACKAGE_PATH: 'export-java-package-path',
  IMPORT: 'export-button-import',
  LOCAL: 'location-local-export',
  NAME: 'export-name',
  PAGE_TABLE_BODY: 'export-page-table-body',
  ROOT: 'export-root',
  SAVE: 'export-button-save',
  TEST_DATA: 'export-test-data',
  TEST_HEADING: 'export-test-heading',
  WEB: 'location-web-export'
};


/**
 * Destroys the export dialog making it unusable.
 */
rpf.ExportDialog.prototype.destroy = function() {
  // Clean up listeners
  this.handlersDynamic_ && this.handlersDynamic_.removeAll();
  this.handlersStatic_ && this.handlersStatic_.removeAll();

  // Remove the content generated by this object from the dialog object's html.
  if (rpf.ExportDialog.Id_.ROOT in this.elements_) {
    goog.dom.removeNode(this.elements_[rpf.ExportDialog.Id_.ROOT]);
  }

  // Remove references to owned objects.
  this.data_ = null;
  this.dialog_ = null;
  this.elements_ = {};
  this.handlersDynamic_ = null;
  this.handlersStatic_ = null;
  this.ready_ = false;
};


/**
 * Initialize the export dialog.
 */
rpf.ExportDialog.prototype.init = function() {
  if (this.isReady()) {
    return;
  }

  try {
    this.initContent_();
    this.initComponents_();
    this.initStaticHandlers_();
  } catch (error) {
    this.destroy();
    console.error('ERROR (rpf.ExportDialog.init): Failed to initialize. ' +
                  'Exception: ' + error);
    return;
  }

  this.ready_ = true;
};


/**
 * Create/Setup the major components of the object.  These components help
 * manage the dialog.  This function is intended to only be called by init.
 * @private
 */
rpf.ExportDialog.prototype.initComponents_ = function() {
  this.handlersDynamic_ = new goog.events.EventHandler();
  this.handlersStatic_ = new goog.events.EventHandler();

  var rootElement = this.elements_[rpf.ExportDialog.Id_.ROOT];
  this.dialog_ = new goog.ui.Dialog();
  this.dialog_.getContentElement().appendChild(rootElement);
  this.dialog_.setTitle('Export Project');
  this.dialog_.setButtonSet(null);
  this.dialog_.setVisible(false);
};


/**
 * Render the content elements for the dialog using soy then store references
 * to specific elements.  Will throw an exception in string form upon error.
 * This function is intended to only be called by init.
 * @private
 */
rpf.ExportDialog.prototype.initContent_ = function() {
  var helper = bite.common.mvc.helper;
  var content = helper.renderModel(rpf.soy.Dialog.exportContent);
  if (!content) {
    throw 'No content was rendered.';
  }

  var key = '';

  // Initialize to null the elements that are always present in the dialog.
  // Don't include the root element because the search looks within that
  // element and will not locate itself.
  var elements = {};
  for (key in rpf.ExportDialog.Id_) {
    var id = rpf.ExportDialog.Id_[key];
    elements[id] = null;
  }

  // Load all relevant elements.
  if (!helper.bulkGetElementById(elements, content)) {
    var keys = [];
    for (key in elements) {
      if (!elements[key]) {
        keys.push(key);
      }
    }
    throw 'Failed to create elements: ' + keys.join(', ');
  }

  // Store relevant Element references for quick lookup later.
  this.elements_ = elements;
};


/**
 * Setup handlers for the dialog.  This function is intended to only be called
 * by init.
 * @private
 */
rpf.ExportDialog.prototype.initStaticHandlers_ = function() {
  // State changing button handlers
  var element = this.elements_[rpf.ExportDialog.Id_.NAME];
  this.handlersStatic_.listen(element, goog.events.EventType.KEYPRESS,
                              goog.bind(this.handleEnter_, this));
  // Loads the project names that were saved from localStorage for
  // autocomplete purpose.
  this.onUiEvents_(
      Bite.Constants.UiCmds.LOAD_PROJECT_NAME_INPUT,
      {},
      /** @type {Event} */ ({}),
      goog.bind(this.setProjectAutoComplete_, this));

  element = this.elements_[rpf.ExportDialog.Id_.GO];
  this.handlersStatic_.listen(element, goog.events.EventType.CLICK,
                              goog.bind(this.requestData_, this,
                                        goog.nullFunction));

  element = this.elements_[rpf.ExportDialog.Id_.SAVE];
  this.handlersStatic_.listen(element, goog.events.EventType.CLICK,
                              goog.bind(this.handleSave_, this));

  element = this.elements_[rpf.ExportDialog.Id_.IMPORT];
  this.handlersStatic_.listen(element, goog.events.EventType.CLICK,
                              goog.bind(this.handleImport_, this));

  element = this.elements_[rpf.ExportDialog.Id_.EXPORT];
  this.handlersStatic_.listen(element, goog.events.EventType.CLICK,
                              goog.bind(this.handleExportClicked_, this));

  element = this.elements_[rpf.ExportDialog.Id_.ADD];
  this.handlersStatic_.listen(element, goog.events.EventType.CLICK,
                              goog.bind(this.handleAdd_, this));
};


/**
 * Returns whether or not the dialog is ready and usable.
 * @return {boolean} Is ready.
 */
rpf.ExportDialog.prototype.isReady = function() {
  return this.ready_;
};


/**
 * Creates a row for the url/page map table.
 * @param {string} url The url pattern.
 * @param {string} name The page's name.
 * @param {Element} element The table's body element to add to.
 * @param {boolean=} opt_first Whether or not the new row should be appended as
 *     the first row (if true) or the last row (if false).  Defaults to false.
 * @private
 */
rpf.ExportDialog.prototype.generateUrlPageMapRow_ = function(url,
                                                             name,
                                                             element,
                                                             opt_first) {
  var helper = bite.common.mvc.helper;

  var first = opt_first || false;

  // Create a new row by creating a table with soy.
  var table = helper.renderModel(rpf.soy.Dialog.getPageMap,
                                 {'url': url, 'name': name});
  if (!table) {
    console.error('ERROR (rpf.ExportDialog.generateUrlPageMapRow_): Failed ' +
                  'to create table.');
    return;
  }

  // Retrieve key elements from the table.
  var row = helper.getElement('export-page-map-row', table);
  var close = helper.getElement('export-page-map-close', table);
  if (!row || !close) {
    console.error('ERROR (rpf.ExportDialog.generateUrlPageMapRow_): New ' +
                  'table does not contain required elements.');
    return;
  }

  // Remove the row from the table and add it to the table within the document.
  goog.dom.removeNode(row);
  if (first) {
    goog.dom.insertChildAt(element, row, 0);
  } else {
    element.appendChild(row);
  }

  // Create a listener for the close button
  var closeObject = {};
  var closeFunc = function() {
    goog.events.unlistenByKey(closeObject.listenerKey);
    goog.dom.removeNode(row);

    // Clear references
    closeObject = null;
    row = null;
  };

  try {
    var key = goog.events.listen(close, goog.events.EventType.CLICK,
                                 closeFunc);
    if (!key) {
      throw 'Failed to create listener; returned null.';
    }
    closeObject.listenerKey = key;
  } catch (error) {
    console.error('ERROR (rpf.ExportDialog.generateUrlPageMapRow_): Failed ' +
                  'to create listener for close button.');
    return;
  }
};


/**
 * Loops over the url/page map elements and extracts a url/page map.
 * @return {!Object} The current url/page map.
 * @private
 */
rpf.ExportDialog.prototype.getUrlPageMap_ = function() {
  var urlPageMap = {};

  var rows = this.elements_[rpf.ExportDialog.Id_.PAGE_TABLE_BODY].rows;
  for (var i = 0, len = rows.length; i < len; ++i) {
    var children = rows[i].children;
    var url = children[0].children[0].value;
    var pageName = children[1].children[0].value;

    if (!url || !pageName) {
      continue;
    }

    urlPageMap[url] = pageName;
  }

  return urlPageMap;
};


/**
 * Opens a page and downloads the zip file.
 * @param {Object} response The response object.
 * @private
 */
rpf.ExportDialog.prototype.getZip_ = function(response) {
  var url = response['url'];
  goog.global.window.open(url);
};


/**
 * Handles the pressing of the plus button that adds a new url/page mapping
 * to the table of mappings.  The new mapping begins empty and the user can
 * add relevant information.
 * @private
 */
rpf.ExportDialog.prototype.handleAdd_ = function() {
  var urlPageMapElement = this.elements_[rpf.ExportDialog.Id_.PAGE_TABLE_BODY];
  this.generateUrlPageMapRow_('', '', urlPageMapElement, true);
};


/**
 * Handles the pressing of the enter key from the project name textbox.  When
 * pressed it acts like pressing the go button and will send out a request
 * for project data.
 * @param {Event} event The event fired when the keyboard is pressed for the
 *     project name textbox.
 * @private
 */
rpf.ExportDialog.prototype.handleEnter_ = function(event) {
  if (event.keyCode == goog.events.KeyCodes.ENTER) {
    this.requestData_();
  }
};


/**
 * Handles the clicking of the export button. Note the project must be
 *     automatically reloaded to sync up the changes before exporting.
 * @private
 */
rpf.ExportDialog.prototype.handleExportClicked_ = function() {
  this.requestData_(goog.bind(this.handleExport_, this));
};


/**
 * Exports the generated Java files by downloading a zip.
 * @param {Object} data The consolidated data.
 * @private
 */
rpf.ExportDialog.prototype.exportAsJavaFilesZip_ = function(data) {
  var dataModel = new rpf.DataModel();
  var processedData = dataModel.convertDataToRaw(data || {});
  var pages = bite.webdriver.getWebdriverCode(processedData);
  var files = {};
  for (var pageName in pages) {
    var filename = pageName + '.java';
    var page = pages[pageName];
    files[filename] = page;
  }
  this.downloadZip_(files);
};


/**
 * Exports the generated data model by downloading a zip.
 * @param {string} dataFile The data model file content.
 * @private
 */
rpf.ExportDialog.prototype.exportAsDataModelZip_ = function(dataFile) {
  var files = {};
  files['data.rpf'] = dataFile;
  this.downloadZip_(files);
};


/**
 * Sends the files object to server to download a zip.
 * @param {Object.<string, string>} files It contains the file name and the
 *     corresponding file content.
 * @private
 */
rpf.ExportDialog.prototype.downloadZip_ = function(files) {
  var command = {
    'command': Bite.Constants.CONSOLE_CMDS.SAVE_ZIP,
    'params': {'files': files}
  };
  var messenger = rpf.Console.Messenger.getInstance();
  messenger.sendMessage(command, goog.bind(this.getZip_, this));
};


/**
 * Handles the clicking of the import button. By default, it will send a ping
 * to local server and try to import the project defined in data.rpf, and
 * then save the project to localStorage for further manipulation.
 * @private
 */
rpf.ExportDialog.prototype.handleImport_ = function() {
  var ids = rpf.ExportDialog.Id_;
  var command = {
    'command': Bite.Constants.CONSOLE_CMDS.LOAD_PROJECT_FROM_LOCAL_SERVER,
    'params': {'path': this.elements_[ids.JAVA_PACKAGE_PATH].value}
  };
  var messenger = rpf.Console.Messenger.getInstance();
  var statusLogger = rpf.StatusLogger.getInstance();
  messenger.sendMessage(command,
                        goog.bind(statusLogger.setStatusCallback,
                                  statusLogger));
  statusLogger.setStatus('Importing the project from your client...');
};


/**
 * Handles the clicking of the export button.  The clicked will pass the
 * necessary data to the translation component.  While exporting the
 * project the dialog will become non-responsive except for the close button on
 * the dialog.  There is no stopping the translation/download process once
 * started.
 * @private
 */
rpf.ExportDialog.prototype.handleExport_ = function() {
  var dataModel = new rpf.DataModel();
  var result = dataModel.consolidateData(
      {'name': this.elements_[rpf.ExportDialog.Id_.NAME].value,
       'tests': this.data_['tests'],
       'project_details': this.data_['project_details']});
  var printer = new goog.format.JsonPrettyPrinter(null);
  var dataFile = printer.format(result);

  var requestUrl = rpf.MiscHelper.getUrl('http://localhost:7171', '', {});

  var pageMap = this.elements_[rpf.ExportDialog.Id_.JAVA_PACKAGE_PATH].value;

  var parameters = goog.Uri.QueryData.createFromMap(
      {'command': 'replaceDatafile',
       'datafilePath': pageMap.split('.').join('/'),
       'fileName': 'data.rpf',
       'content': dataFile}).toString();

  goog.net.XhrIo.send(requestUrl, goog.bind(function(e) {
    var xhr = e.target;
    if (xhr.isSuccess()) {
      rpf.StatusLogger.getInstance().setStatus(xhr.getResponseText());
    } else {
      // If it fails, we assume the local server is not ready, so we will
      // send files to the server and then await its response to pull the zip
      // down to the local machine.
      var msg = xhr.getResponseText() || 'Local server is not ready...';
      rpf.StatusLogger.getInstance().setStatus(msg, 'red');
      this.exportAsDataModelZip_(dataFile);
    }
  }, this), 'POST', parameters);
};


/**
 * Handles the clicking of the save button.  When pressed the current project
 * details will be formed into an object and sent to the server to be saved.
 * @private
 */
rpf.ExportDialog.prototype.handleSave_ = function() {
  var name = this.elements_[rpf.ExportDialog.Id_.NAME].value;
  if (!name) {
    return;
  }

  rpf.StatusLogger.getInstance().setStatus(rpf.StatusLogger.SAVING, 'yellow');

  // Disable dialog elements
  for (var key in rpf.ExportDialog.Id_) {
    var id = rpf.ExportDialog.Id_[key];
    var element = this.elements_[id];
    element.setAttribute('disabled', 'disabled');
  }

  var urlPageMap = this.getUrlPageMap_();
  var ids = rpf.ExportDialog.Id_;
  var wdPage = this.elements_[ids.JAVA_PACKAGE_PATH].value || '';

  var details = {
    'page_map': goog.json.serialize(urlPageMap),
    'java_package_path': wdPage
  };

  var data = {
    'command': '',
    'params': {
      'name': name,
      'data': goog.json.serialize(details)
    }
  };

  var location = this.getStorageLocation_();
  if ('web' == location) {
    data['command'] = Bite.Constants.CONSOLE_CMDS.SAVE_PROJECT;
  } else {
    data['command'] = Bite.Constants.CONSOLE_CMDS.SAVE_PROJECT_METADATA_LOCALLY;
  }

  rpf.Console.Messenger.getInstance().sendMessage(data,
      goog.bind(this.handleSaveComplete_, this, name));
};


/**
 * Handles the response from the server after a request to save the project
 * details.
 * @param {string} name The name of the project that is being saved.
 * @param {Object} responseObj The object returned from the request.
 * @private
 */
rpf.ExportDialog.prototype.handleSaveComplete_ = function(name, responseObj) {
  // Enable dialog elements
  for (var key in rpf.ExportDialog.Id_) {
    var id = rpf.ExportDialog.Id_[key];
    var element = this.elements_[id];
    if (element.hasAttribute('disabled')) {
      element.removeAttribute('disabled');
    }
  }

  // Process response
  if (!responseObj || !('success' in responseObj) || !responseObj['success']) {
    rpf.StatusLogger.getInstance().setStatus(rpf.StatusLogger.SAVE_FAILED,
                                             'red');
  } else {
    rpf.StatusLogger.getInstance().setStatus(rpf.StatusLogger.SAVE_SUCCESS,
                                             'green');
  }
};


/**
 * Sends a request for the specified project given the current search state.
 * While the request is being processed a loading icon is displayed.
 * @param {function()=} opt_callback The optional callback function.
 * @private
 */
rpf.ExportDialog.prototype.requestData_ = function(opt_callback) {
  var name = this.elements_[rpf.ExportDialog.Id_.NAME].value;
  if (!name) {
    return;
  }

  rpf.StatusLogger.getInstance().setStatus(rpf.StatusLogger.LOAD_TEST,
                                           'yellow');

  // Clear major elements
  this.elements_[rpf.ExportDialog.Id_.TEST_DATA].innerHTML = '';
  this.elements_[rpf.ExportDialog.Id_.PAGE_TABLE_BODY].innerHTML = '';
  this.elements_[rpf.ExportDialog.Id_.JAVA_PACKAGE_PATH].value = '';

  // Disable dialog elements
  for (var key in rpf.ExportDialog.Id_) {
    var id = rpf.ExportDialog.Id_[key];
    var element = this.elements_[id];
    element.setAttribute('disabled', 'disabled');
  }

  var location = this.getStorageLocation_();
  var data = {
    'command': '',
    'params': {
      'name': name
    }
  };

  if ('web' == location) {
    // Send request to the server for the project details and set of associated
    // tests (and test data).
    data['command'] = Bite.Constants.CONSOLE_CMDS.GET_PROJECT;
  } else {
    data['command'] = Bite.Constants.CONSOLE_CMDS.GET_LOCAL_PROJECT;
  }
  rpf.Console.Messenger.getInstance().sendMessage(data,
      goog.bind(this.requestDataComplete_, this, name,
                opt_callback || goog.nullFunction));
};


/**
 * Handles the response from the server after a request to load the project
 * details and tests.
 * @param {string} name The name of the project that is being saved.
 * @param {function()} callback The callback function.
 * @param {Object} responseObj The object returned from the request.
 * @private
 */
rpf.ExportDialog.prototype.requestDataComplete_ = function(
    name, callback, responseObj) {
  var statusLogger = rpf.StatusLogger.getInstance();
  // Enable dialog elements
  for (var key in rpf.ExportDialog.Id_) {
    var id = rpf.ExportDialog.Id_[key];
    var element = this.elements_[id];
    if (element.hasAttribute('disabled')) {
      element.removeAttribute('disabled');
    }
  }

  // Process response
  // Check response data for appropriate major components; project_details and
  // tests.
  this.data_ = 'jsonObj' in responseObj ? responseObj['jsonObj'] : null;
  // If an error occurs during communication then the object will have an
  // error key added to the response.
  if (!this.data_ || 'error' in this.data_) {
    this.data_ = null;
    statusLogger.setStatus(rpf.StatusLogger.PROJECT_NOT_FOUND, 'red');
    return;
  }

  var details =
      'project_details' in this.data_ ? this.data_['project_details'] : null;
  if (!details) {
    this.data_ = null;
    statusLogger.setStatus(rpf.StatusLogger.PROJECT_MISSING_DETAILS, 'red');
    return;
  }

  if (!('page_map' in details && 'java_package_path' in details)) {
    this.data_ = null;
    statusLogger.setStatus(rpf.StatusLogger.PROJECT_MISSING_DETAILS, 'red');
    return;
  }

  try {
    var typeOfPageMap = typeof details['page_map'];
    if ('object' == typeOfPageMap) {
      details['page_map'] = details['page_map'];
    } else if ('string' == typeOfPageMap) {
      details['page_map'] =
          /** @type {!Object} */ (goog.json.parse(details['page_map']));
    } else {
      statusLogger.setStatus('Incorrect page map argument.', 'red');
      throw new Error();
    }

    // Update the url/page map for all project data.  When generating the
    // webdriver code, the reference to the url/page map is updated.  Thus
    // the generated code is thrown away but the mapping is updated.
    bite.webdriver.getWebdriverCode(this.data_);
  } catch (error) {
    this.data_ = null;
    statusLogger.setStatus('Parse json failed.');
    console.error('ERROR (rpf.ExportDialog.requestDataComplete_): Failed to ' +
                  'parse json for url/page map: ' + error);
    return;
  }

  var tests = 'tests' in this.data_ ? this.data_['tests'] : null;
  if (!tests) {
    this.data_ = null;
    statusLogger.setStatus(rpf.StatusLogger.PROJECT_NO_TESTS, 'red');
    return;
  }

  // Get list of test names and update appropriate dialog element with data.
  var names = [];
  for (var i = 0, len = tests.length; i < len; ++i) {
    names.push(tests[i]['test_name']);
  }
  names = names.sort();

  var testElement = this.elements_[rpf.ExportDialog.Id_.TEST_DATA];
  bite.common.mvc.helper.renderModelFor(testElement,
                                        rpf.soy.Dialog.getTests,
                                        {'tests': names});

  // Set page/url mappings
  var urlPageMap = details['page_map'];
  var urls = [];
  for (var key in urlPageMap) {
    urls.push(key);
  }
  urls = urls.sort();

  var urlPageMapElement = this.elements_[rpf.ExportDialog.Id_.PAGE_TABLE_BODY];
  for (i = 0, len = urls.length; i < len; ++i) {
    var url = urls[i];
    var pageName = urlPageMap[url];
    this.generateUrlPageMapRow_(url, pageName, urlPageMapElement);
  }

  // Set webdriver configuration
  var javaPackagePath = this.elements_[rpf.ExportDialog.Id_.JAVA_PACKAGE_PATH];
  javaPackagePath.value = details['java_package_path'];

  statusLogger.setStatus(rpf.StatusLogger.LOAD_TEST_SUCCESS, 'green');
  var messenger = rpf.Console.Messenger.getInstance();
  messenger.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.PROJECT_LOADED_IN_EXPORT);
  callback();
};


/**
 * Sets the visibility of the export dialog.
 * @param {boolean} display Whether or not to show the dialog.
 */
rpf.ExportDialog.prototype.setVisible = function(display) {
  if (this.isReady()) {
    this.dialog_.setVisible(display);
  }
};


/**
 * Sets the location where the project is loaded from.
 * @param {boolean} isWeb Whether the location is the web.
 * @private
 */
rpf.ExportDialog.prototype.setLocation_ = function(isWeb) {
  this.elements_[rpf.ExportDialog.Id_.LOCAL].checked = !isWeb;
  this.elements_[rpf.ExportDialog.Id_.WEB].checked = isWeb;
};


/**
 * Sets the project name.
 * @param {string} projectName The project name.
 * @private
 */
rpf.ExportDialog.prototype.setProjectName_ = function(projectName) {
  this.elements_[rpf.ExportDialog.Id_.NAME].value = projectName;
};


/**
 * Gets the storage location.
 * @return {string} The storage location.
 * @private
 */
rpf.ExportDialog.prototype.getStorageLocation_ = function() {
  if (this.elements_[rpf.ExportDialog.Id_.LOCAL].checked) {
    return this.elements_[rpf.ExportDialog.Id_.LOCAL].value;
  } else if (this.elements_[rpf.ExportDialog.Id_.WEB].checked) {
    return this.elements_[rpf.ExportDialog.Id_.WEB].value;
  }

  rpf.StatusLogger.getInstance().setStatus('Please select a location.', 'red');
  throw new Error('No location was specified.');
};


/**
 * Automates the dialog.
 * @param {boolean} isWeb Whether the location is the web.
 * @param {string} project The project name.
 */
rpf.ExportDialog.prototype.automateDialog = function(isWeb, project) {
  this.setLocation_(isWeb);
  this.setProjectName_(project);
  this.requestData_();
};


/**
 * Sets the project name autocomplete.
 * @param {Array} names The array of project names.
 * @private
 */
rpf.ExportDialog.prototype.setProjectAutoComplete_ = function(names) {
  new goog.ui.AutoComplete.Basic(
      names, this.elements_[rpf.ExportDialog.Id_.NAME], false);
};

