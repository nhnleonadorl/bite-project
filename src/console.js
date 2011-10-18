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
 * @fileoverview This file contains the console manager.
 * TODO(phu): Add potential garbage collection methods for the UI elements.
 *
 * @author phu@google.com (Po Hu)
 */


goog.provide('rpf.ConsoleManager');
goog.provide('rpf.ConsoleManager.ModeInfo');

goog.require('Bite.Constants');
goog.require('bite.base.Helper');
goog.require('bite.client.Templates.rpfConsole');
goog.require('bite.console.Helper');
goog.require('bite.locators.Updater');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.ViewportSizeMonitor');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.positioning.AnchoredViewportPosition');
goog.require('goog.positioning.ClientPosition');
goog.require('goog.positioning.Corner');
goog.require('goog.string');
goog.require('goog.style');
goog.require('goog.ui.Option');
goog.require('goog.ui.Toolbar');
goog.require('goog.ui.ToolbarButton');
goog.require('goog.ui.ToolbarSelect');
goog.require('goog.ui.ToolbarSeparator');
goog.require('rpf.CodeGenerator');
goog.require('rpf.ConsoleLogger');
goog.require('rpf.DetailsDialog');
goog.require('rpf.EditorManager');
goog.require('rpf.ExportDialog');
goog.require('rpf.InfoDialog');
goog.require('rpf.LoaderDialog');
goog.require('rpf.MiscHelper');
goog.require('rpf.NotesDialog');
goog.require('rpf.PlayDialog');
goog.require('rpf.QuickCmdDialog');
goog.require('rpf.SaveDialog');
goog.require('rpf.ScreenShotDialog');
goog.require('rpf.SettingDialog');
goog.require('rpf.StatusLogger');
goog.require('rpf.Tests');
goog.require('rpf.ValidateDialog');



/**
 * A class for handling console related functions.
 * @param {boolean=} opt_noConsole Whether ConsoleManager is constructed with
 *     rpf Console UI or not.
 * @constructor
 * @export
 */
rpf.ConsoleManager = function(opt_noConsole) {
  /**
   * The messenger.
   * @type {rpf.Console.Messenger}
   * @private
   */
  this.messenger_ = rpf.Console.Messenger.getInstance();

  /**
   * The locator updater.
   * @type {bite.locators.Updater}
   * @private
   */
  this.locatorUpdater_ = null;

  /**
   * The screenshot dialog.
   * @type {rpf.ScreenShotDialog}
   * @private
   */
  this.screenshotDialog_ = new rpf.ScreenShotDialog();


  /**
   * The recorded script.
   * @type {string}
   * @private
   */
  this.recordedScript_ = '';

  /**
   * The status logger.
   * @type {rpf.StatusLogger}
   * @private
   */
  this.statusLogger_ = rpf.StatusLogger.getInstance();

  /**
   * The project info object, which for now includes an array of json test info,
   * and will include more project specific info like url/PageName mapper and
   * package name, etc. later.
   * @type {Object}
   * @private
   */
  this.projectInfo_ = new rpf.Tests();

  /**
   * The info map.
   * @type {Object}
   * @private
   */
  this.infoMap_ = {};

  /**
   * The user id.
   * @type {string}
   * @private
   */
  this.userId_ = '';

  /**
   * Whether ConsoleManager is constructed with rpf Console UI or not.
   * @type {boolean}
   * @private
   */
  this.noConsole_ = !!opt_noConsole;

  /**
   * Manages the updating all similar elements.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.updateAllHandler_ = new goog.events.EventHandler();

  /**
   * Manages resizes of the window.
   * @type {goog.dom.ViewportSizeMonitor}
   * @private
   */
  this.viewportSizeMonitor_ = new goog.dom.ViewportSizeMonitor();

  if (!this.noConsole_) {
    this.init_();
  }
};
goog.addSingletonGetter(rpf.ConsoleManager);


/**
 * Inits the console manager's UI.
 * @private
 */
rpf.ConsoleManager.prototype.init_ = function() {
  this.initUI_();

  var toolbar = new goog.ui.Toolbar();

  this.setButton(rpf.ConsoleManager.Buttons.PLAY,
                 'Run your script',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_PLAYBACK_RUNTIME);
  this.setButton(rpf.ConsoleManager.Buttons.SAVE,
                 'Save your script',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_SAVE_DIALOG);
  this.setButton(rpf.ConsoleManager.Buttons.LOAD,
                 'Load your script',
                 toolbar,
                 Bite.Constants.UiCmds.LOAD_CMDS);
  this.setButton(rpf.ConsoleManager.Buttons.RECORD,
                 'Record your interaction',
                 toolbar,
                 Bite.Constants.UiCmds.START_RECORDING);
  this.setButton(rpf.ConsoleManager.Buttons.STOP,
                 'Stop recording',
                 toolbar,
                 Bite.Constants.UiCmds.STOP_RECORDING);

  toolbar.addChild(new goog.ui.ToolbarSeparator(), true);

  this.setButton(rpf.ConsoleManager.Buttons.EXPORT,
                 'Export a project',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_EXPORT);
  this.setButton(rpf.ConsoleManager.Buttons.NOTES,
                 'Show additional script info',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_NOTES);
  this.setButton(rpf.ConsoleManager.Buttons.INFO,
                 'Show the logs',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_INFO);
  this.setButton(rpf.ConsoleManager.Buttons.SCREEN,
                 'View the captured screenshots',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_SCREENSHOT);
  this.setButton(rpf.ConsoleManager.Buttons.ADD_CMD,
                 'Show the quick command dialog',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_QUICK_CMDS);
  this.setButton(rpf.ConsoleManager.Buttons.VALIDATE,
                 'Switch to validation mode',
                 toolbar,
                 Bite.Constants.UiCmds.START_VALIDATE);
  this.setButton(rpf.ConsoleManager.Buttons.WORKER,
                 'Switch to worker mode',
                 toolbar,
                 Bite.Constants.UiCmds.START_WORKER_MODE);
  this.setButton(rpf.ConsoleManager.Buttons.SETTING,
                 'Show the settings dialog',
                 toolbar,
                 Bite.Constants.UiCmds.SHOW_SETTING);

  toolbar.addChild(new goog.ui.ToolbarSeparator(), true);

  this.setButton(rpf.ConsoleManager.Buttons.REFRESH,
                 'Refresh the rpf console',
                 toolbar,
                 Bite.Constants.UiCmds.ON_CONSOLE_REFRESH);


  this.modeSelector_ = this.getModeSelector_();
  toolbar.render(goog.dom.getElement('console_toolbar'));

  this.changeMode(Bite.Constants.ConsoleModes.IDLE);

  goog.events.listen(
      window,
      'keydown',
      goog.bind(this.onUiEvents,
                this,
                Bite.Constants.UiCmds.ON_KEY_DOWN,
                {}));
  goog.events.listen(
      window,
      'keyup',
      goog.bind(this.onUiEvents,
                this,
                Bite.Constants.UiCmds.ON_KEY_UP,
                {}));
  goog.events.listen(
      goog.dom.getElement('moreInfoHeader'),
      goog.events.EventType.CLICK,
      goog.bind(this.onUiEvents,
                this,
                Bite.Constants.UiCmds.ON_SHOW_MORE_INFO,
                {}));

  goog.global.window.focus();
  chrome.extension.onRequest.addListener(
      goog.bind(this.makeConsoleCall, this));

  this.viewportSizeMonitor_.addEventListener(goog.events.EventType.RESIZE,
                                             goog.bind(this.onResize_, this));
};


/**
 * Initializes Console Manager's UI parameters.
 * @private
 */
rpf.ConsoleManager.prototype.initUI_ = function() {
 /**
   * Whether or not is recording.
   * @type {boolean}
   * @private
   */
  this.isRecording_ = false;

  /**
   * Whether or not is playing back.
   * @type {boolean}
   * @private
   */
  this.isPlaying_ = false;

  /**
   * The current mode.
   * @type {Bite.Constants.ConsoleModes}
   * @private
   */
  this.mode_ = Bite.Constants.ConsoleModes.IDLE;

  /**
   * The buttons displayed on console UI.
   * @type {Object}
   * @private
   */
  this.btns_ = {};

  /**
   * The modeInfo static object.
   * @type {rpf.ConsoleManager.ModeInfo}
   * @private
   */
  this.modeInfo_ = new rpf.ConsoleManager.ModeInfo();

  /**
   * The line number that should be highlighted.
   * @type {number}
   * @private
   */
  this.lineHighlighted_ = -1;

  /**
   * The mode selector.
   * @type {Object}
   * @private
   */
  this.modeSelector_ = null;

  /**
   * The current view mode.
   * @type {Bite.Constants.ViewModes}
   * @private
   */
  this.viewMode_ = Bite.Constants.ViewModes.CODE;

  /**
   * The line to be inserted.
   * @type {number}
   * @private
   */
  this.lineToInsert_ = -1;

  /**
   * The editor manager.
   * @type {rpf.EditorManager}
   * @private
   */
  this.editorMngr_ = new rpf.EditorManager(
      Bite.Constants.RpfConsoleId.SCRIPTS_CONTAINER,
      goog.bind(this.fetchDataFromBackground_, this),
      goog.bind(this.getViewMode, this),
      goog.bind(this.getInfoMap, this));

  goog.events.listen(this.editorMngr_.getContainer(),
                     goog.events.EventType.DBLCLICK,
                     goog.bind(this.popupDetailedInfo_, this));

  /**
   * The notes dialog.
   * @type {rpf.NotesDialog}
   * @private
   */
  this.notesDialog_ = new rpf.NotesDialog(
      this.messenger_, goog.bind(this.onUiEvents, this));

  /**
   * The export dialog.
   * @type {rpf.ExportDialog}
   * @private
   */
  this.exportDialog_ = new rpf.ExportDialog(goog.bind(this.onUiEvents, this));
  this.exportDialog_.init();

  /**
   * The quick commands dialog.
   * @type {rpf.QuickCmdDialog}
   * @private
   */
  this.quickDialog_ = new rpf.QuickCmdDialog(
      goog.bind(this.onUiEvents, this));

  /**
   * The loader dialog.
   * @type {rpf.LoaderDialog}
   * @private
   */
  this.loaderDialog_ = new rpf.LoaderDialog(
      this.messenger_,
      goog.bind(this.onUiEvents, this));

  /**
   * The save dialog.
   * @type {rpf.SaveDialog}
   * @private
   */
  this.saveDialog_ = new rpf.SaveDialog(
      this.messenger_,
      goog.bind(this.onUiEvents, this));

  /**
   * The validation dialog.
   * @type {rpf.ValidateDialog}
   * @private
   */
  this.validationDialog_ = new rpf.ValidateDialog(
      this.messenger_,
      goog.bind(this.onUiEvents, this));

  /**
   * The details dialog.
   * @type {rpf.DetailsDialog}
   * @private
   */
  this.detailsDialog_ = new rpf.DetailsDialog(
      this.messenger_,
      goog.bind(this.onUiEvents, this),
      this.editorMngr_,
      this.screenshotDialog_);

  /**
   * The playback dialog.
   * @type {rpf.PlayDialog}
   * @private
   */
  this.playbackRuntimeDialog_ = new rpf.PlayDialog(
      this.messenger_, goog.bind(this.onUiEvents, this));

  /**
   * The setting dialog.
   * @type {rpf.SettingDialog}
   * @private
   */
  this.settingDialog_ = new rpf.SettingDialog(goog.bind(this.onUiEvents, this));

  /**
   * The info dialog.
   * @type {rpf.InfoDialog}
   * @private
   */
  this.infoDialog_ = new rpf.InfoDialog();
};


/**
 * Expands the more info zippy.
 * @private
 */
rpf.ConsoleManager.prototype.expandZippy_ = function() {
  var moreInfoDiv = goog.dom.getElement('moreInfoDiv');
  goog.style.setStyle(moreInfoDiv, 'display', 'block');
};


/**
 * Toggles the more info zippy.
 * @private
 */
rpf.ConsoleManager.prototype.toggleZippy_ = function() {
  var moreInfoDiv = goog.dom.getElement('moreInfoDiv');
  var displayStyle = goog.style.getStyle(moreInfoDiv, 'display');
  if (displayStyle == 'block') {
    goog.style.setStyle(moreInfoDiv, 'display', 'none');
  } else {
    goog.style.setStyle(moreInfoDiv, 'display', 'block');
  }
};


/**
 * The local location.
 * @type {string}
 * @private
 */
rpf.ConsoleManager.LOCAL_ = 'local';


/**
 * The web location.
 * @type {string}
 * @private
 */
rpf.ConsoleManager.WEB_ = 'web';


/**
 * The project names.
 * @type {string}
 * @private
 */
rpf.ConsoleManager.PROJECTS_ = 'projectNames';


/**
 * The number of project names that is saved in localStorage.
 * @type {number}
 * @private
 */
rpf.ConsoleManager.PROJECTS_LENGTH_ = 15;


/**
 * Handles window resizes.
 * @private
 */
rpf.ConsoleManager.prototype.onResize_ = function() {
  var curSize = this.viewportSizeMonitor_.getSize();
  var container = goog.dom.getElement('scriptsContainer');
  goog.style.setSize(container, curSize.width, curSize.height - 118);
  this.screenshotDialog_.resize();
};


/**
 * Loads the project names from localStorage.
 * @return {Array} The project names.
 * @private
 */
rpf.ConsoleManager.prototype.loadProjectNamesFromLocalStorage_ = function() {
  var projectStr = goog.global.localStorage.getItem(
      rpf.ConsoleManager.PROJECTS_);
  if (!projectStr) {
    return [];
  }
  return /** @type {Array} */ (goog.json.parse(projectStr));
};


/**
 * Saves the project names to local storage if the project was successfully
 * loaded. If the project name already exists in the array, it will remove
 * the name first and insert the name in the beginning of the array.
 * @param {string} name The project name.
 * @private
 */
rpf.ConsoleManager.prototype.saveProjectNamesToLocalStorage_ = function(name) {
  var projectStr = goog.global.localStorage.getItem(
      rpf.ConsoleManager.PROJECTS_);
  if (!projectStr) {
    var projectNames = [];
  } else {
    var projectNames = /** @type {Array} */ (goog.json.parse(projectStr));
    var index = goog.array.indexOf(projectNames, name);
    if (index >= 0) {
      projectNames.splice(index, 1);
    }
    projectNames.unshift(name);
    if (projectNames.length >= rpf.ConsoleManager.PROJECTS_LENGTH_) {
      projectNames.pop();
    }
  }
  goog.global.localStorage.setItem(
      rpf.ConsoleManager.PROJECTS_, goog.json.serialize(projectNames));
};


/**
 * Fetches init data from background.
 * @private
 */
rpf.ConsoleManager.prototype.fetchDataFromBackground_ = function() {
  this.messenger_.sendMessage(
    {'command': Bite.Constants.CONSOLE_CMDS.FETCH_DATA_FROM_BACKGROUND,
     'params': {}},
    goog.bind(this.fetchDataFromBackgroundCallback_, this));
};


/**
 * Fetches init data from background callback.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.fetchDataFromBackgroundCallback_ = function(
    response) {
  this.userId_ = response['userId'];
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.RPF_CONSOLE_OPENED);
};


/**
 * Gets the mode selector control.
 * @return {goog.ui.ToolbarSelect} The mode selector.
 * @private
 */
rpf.ConsoleManager.prototype.getModeSelector_ = function() {
  var modeMenu = new goog.ui.Menu();
  var codeOption = new goog.ui.Option('Code');
  var readOption = new goog.ui.Option('Readable');
  var bookOption = new goog.ui.Option('Book');
  var updaterOption = new goog.ui.Option('Updater');
  modeMenu.addChild(codeOption, true);
  modeMenu.addChild(readOption, true);
  modeMenu.addChild(bookOption, true);
  modeMenu.addChild(updaterOption, true);
  var modeSelector = new goog.ui.ToolbarSelect('Mode', modeMenu);
  modeSelector.setSelectedIndex(0);
  goog.events.listen(
      codeOption,
      goog.ui.Component.EventType.ACTION,
      goog.bind(this.selectViewCodeMode_, this));
  goog.events.listen(
      readOption,
      goog.ui.Component.EventType.ACTION,
      goog.bind(this.selectViewReadableMode_, this));
  goog.events.listen(
      bookOption,
      goog.ui.Component.EventType.ACTION,
      goog.bind(this.selectViewBookMode_, this));
  goog.events.listen(
      updaterOption,
      goog.ui.Component.EventType.ACTION,
      goog.bind(this.selectUpdaterMode_, this));
  return modeSelector;
};


/**
 * Adds a tooblar button.
 * @param {rpf.ConsoleManager.Buttons} btn The buttons displayed on console UI.
 * @param {string} tooltip Tool tip for the toolbar button.
 * @param {goog.ui.Toolbar} toolbar The toolbar to add buttons on.
 * @param {Bite.Constants.UiCmds} uiCmd The corresponding message.
 * @export
 */
rpf.ConsoleManager.prototype.setButton = function(
    btn, tooltip, toolbar, uiCmd) {
  var toolbarItem = new goog.ui.ToolbarButton(goog.dom.getElement(btn));
  toolbarItem.setTooltip(tooltip);
  this.btns_[btn] = toolbarItem;
  toolbar.addChild(toolbarItem, true);
  goog.events.listen(
      toolbarItem.getElement(),
      goog.events.EventType.CLICK,
      goog.bind(this.onUiEvents,
                this,
                uiCmd,
                {}));
};


/**
 * Event handler for calls from background world.
 * @param {Object} request The request object.
 * @param {MessageSender} sender The sender object.
 * @param {function(Object)=} opt_callback The callback function.
 * @export
 */
rpf.ConsoleManager.prototype.makeConsoleCall = function(
    request, sender, opt_callback) {
  this.logInfo('Got this message: ' + request['command']);
  this.handleMessages_(
      request['command'], request['params'], opt_callback);
};


/**
 * Handles the events happened on UI.
 * @param {Bite.Constants.UiCmds} uiCmd The message of the event.
 * @param {Object} params The params object.
 * @param {Event} event The event object.
 * @param {function(Object)=} opt_callback The optional callback function.
 * @export
 */
rpf.ConsoleManager.prototype.onUiEvents = function(
    uiCmd, params, event, opt_callback) {
  params['event'] = event;
  this.handleMessages_(uiCmd, params, opt_callback);
};


/**
 * Handles the messages to control the actions on UI.
 * @param {Bite.Constants.UiCmds} uiCmd The command will be performed on UI.
 * @param {Object} params The params object.
 * @param {function(Object)=} opt_callback The optional callback function.
 * @private
 */
rpf.ConsoleManager.prototype.handleMessages_ = function(
    uiCmd, params, opt_callback) {
  switch (uiCmd) {
    // For the console helper.
    case Bite.Constants.UiCmds.LOAD_SELECTED_LIB:
      this.notesDialog_.getHelper().loadSelectedLib();
      break;
    case Bite.Constants.UiCmds.GENERATE_CUSTOMIZED_FUNCTION_CALL:
      var value = this.notesDialog_.getHelper().generateCustomizedFunctionCall(
          params['event']);
      this.quickDialog_.writeCmd(
          rpf.QuickCmdDialog.Commands.FUNCTION, value);
      break;

    // For the details dialog.
    case Bite.Constants.UiCmds.UPDATE_HIGHLIGHT_LINE:
      this.updateHighlightLine(params['lineNum']);
      break;
    case Bite.Constants.UiCmds.ON_PREV_PAGE:
      this.findPrevCmd(this.detailsDialog_.getCurLineNum());
      break;
    case Bite.Constants.UiCmds.ON_NEXT_PAGE:
      this.findNextCmd(this.detailsDialog_.getCurLineNum());
      break;
    case Bite.Constants.UiCmds.ON_EDIT_CMD:
      this.detailsDialog_.onEditCmd();
      break;
    case Bite.Constants.UiCmds.ON_CMD_MOVE_UP:
      this.detailsDialog_.onCmdMoveUp();
      break;
    case Bite.Constants.UiCmds.ON_CMD_MOVE_DOWN:
      this.detailsDialog_.onCmdMoveDown();
      break;
    case Bite.Constants.UiCmds.ON_INSERT_ABOVE:
      this.detailsDialog_.setVisible(false);
      this.setLineToInsert(this.detailsDialog_.getCurLineNum());
      this.startRecording();
      break;
    case Bite.Constants.UiCmds.ON_INSERT_BELOW:
      this.detailsDialog_.setVisible(false);
      this.setLineToInsert(this.detailsDialog_.getCurLineNum() + 1);
      this.startRecording();
      break;
    case Bite.Constants.UiCmds.ON_REMOVE_CUR_LINE:
      this.detailsDialog_.onRemoveCurLine();
      break;

    // For the playback dialog.
    case Bite.Constants.UiCmds.AUTOMATE_PLAY_MULTIPLE_TESTS:
      this.playbackRuntimeDialog_.setVisible(true);
      this.playbackRuntimeDialog_.automateDialog(params['testInfo']);
      this.messenger_.sendStatusMessage(
          Bite.Constants.COMPLETED_EVENT_TYPES.RUN_PLAYBACK_STARTED);
      break;
    case Bite.Constants.UiCmds.UPDATE_COMMENT:
      this.playbackRuntimeDialog_.updateComment(
          params['id'], params['comment']);
      break;
    case Bite.Constants.UiCmds.UPDATE_ELEMENT_AT_LINE:
      this.updateElementAtLine_(
          params['line'], params['cmdMap'], opt_callback || goog.nullFunction);
      break;
    case Bite.Constants.UiCmds.SET_PLAYBACK_ALL:
      this.startPlayback(Bite.Constants.PlayMethods.ALL);
      this.playbackRuntimeDialog_.setPlaybackAll();
      break;
    case Bite.Constants.UiCmds.SET_PLAYBACK_STEP:
      this.playbackRuntimeDialog_.setPlaybackStep();
      this.startPlayback(Bite.Constants.PlayMethods.STEP);
      break;
    case Bite.Constants.UiCmds.SET_PLAYBACK_PAUSE:
      this.playbackRuntimeDialog_.setPlaybackPause(params['uiOnly']);
      break;
    case Bite.Constants.UiCmds.SET_PLAYBACK_STOP:
      this.playbackRuntimeDialog_.setPlaybackStop();
      break;
    case Bite.Constants.UiCmds.SET_PLAYBACK_STOP_ALL:
      this.messenger_.sendMessage(
          {'command': Bite.Constants.CONSOLE_CMDS.STOP_GROUP_TESTS,
           'params': {}});
      this.playbackRuntimeDialog_.setPlaybackStop();
      break;
    case Bite.Constants.UiCmds.SET_FINISHED_TESTS_NUMBER:
      this.playbackRuntimeDialog_.setFinishedNumber(params['num']);
      break;
    case Bite.Constants.UiCmds.DELETE_CMD:
      var lineNum = this.playbackRuntimeDialog_.deleteCmd();
      this.getEditorManager().removeCurrentLine(lineNum - 1);
      break;
    case Bite.Constants.UiCmds.FAIL_CMD:
      this.playbackRuntimeDialog_.failCmd();
      break;
    case Bite.Constants.UiCmds.OVERRIDE_CMD:
      this.playbackRuntimeDialog_.overrideCmd();
      break;
    case Bite.Constants.UiCmds.UPDATE_CMD:
      this.playbackRuntimeDialog_.updateCmd();
      break;
    case Bite.Constants.UiCmds.INSERT_CMD:
      var lineNum = this.playbackRuntimeDialog_.insertCmd();
      this.setLineToInsert(lineNum);
      break;

    // For the note dialog.
    case Bite.Constants.UiCmds.ADD_TO_COMMON_LIB:
      this.notesDialog_.addToCommonLib();
      break;

    // For the validation dialog.
    case Bite.Constants.UiCmds.DISPLAY_ALL_ATTRIBUTES:
      this.validationDialog_.displayAllAttributes();
      break;

    // For the export dialog.
    case Bite.Constants.UiCmds.AUTOMATE_EXPORT_DIALOG_LOAD_PROJECT:
      this.exportDialog_.automateDialog(params['isWeb'], params['project']);
      break;

    // For the save dialog.
    case Bite.Constants.UiCmds.AUTOMATE_DIALOG_SAVE_TEST:
      this.saveDialog_.automateDialog(params['project'], params['isWeb']);
      break;
    case Bite.Constants.UiCmds.SAVE_TEST:
      this.saveTest();
      break;
    case Bite.Constants.UiCmds.CANCEL_CMDS:
      this.saveDialog_.cancelCmds();
      break;

    // For the quick command dialog.
    case Bite.Constants.UiCmds.UPDATE_INVOKE_SELECT:
      this.quickDialog_.updateInvokeSelect(params['names'], params['ids']);
      this.playbackRuntimeDialog_.updateTestSelection(
          params['names'], params['ids']);
      break;

    // For the load dialog.
    case Bite.Constants.UiCmds.LOAD_SELECTED_TEST:
      this.statusLogger_.setStatus(rpf.StatusLogger.LOAD_TEST, 'yellow');
      this.loaderDialog_.loadSelectedTest(
          goog.bind(this.loadTestCallback_, this));
      break;
    case Bite.Constants.UiCmds.AUTOMATE_DIALOG_LOAD_TEST:
      this.loaderDialog_.automateDialog(
          params['isWeb'],
          params['project'],
          params['test'],
          goog.bind(this.loadTestCallback_, this));
      break;
    case Bite.Constants.UiCmds.AUTOMATE_DIALOG_LOAD_PROJECT:
      this.loaderDialog_.automateDialog(
          params['isWeb'],
          params['project'],
          '',
          goog.bind(this.loadProjectCallback_, this));
      break;
    case Bite.Constants.UiCmds.DELETE_SELECTED_TEST:
      this.loaderDialog_.deleteSelectedTest();
      break;
    case Bite.Constants.UiCmds.CANCEL_DIALOG:
      this.loaderDialog_.cancelDialog();
      break;
    case Bite.Constants.UiCmds.SET_PROJECT_INFO:
      this.setProjectInfo(params['tests'], params['from'], params['details']);
      break;

    // For the main console.
    case Bite.Constants.UiCmds.LOAD_PROJECT_NAME_INPUT:
      opt_callback(this.loadProjectNamesFromLocalStorage_());
      break;
    case Bite.Constants.UiCmds.SAVE_PROJECT_NAME_INPUT:
      this.saveProjectNamesToLocalStorage_(params['name']);
      break;
    case Bite.Constants.UiCmds.SET_CONSOLE_STATUS:
      this.statusLogger_.setStatus(params['message'], params['color']);
      break;
    case Bite.Constants.UiCmds.UPDATE_PLAYBACK_STATUS:
      this.updatePlaybackStatus(params['text'], params['color']);
      break;
    case Bite.Constants.UiCmds.UPDATE_CURRENT_STEP:
      this.updateCurrentStep(params['curStep']);
      break;
    case Bite.Constants.UiCmds.LOAD_TEST_FROM_LOCAL:
      this.messenger_.sendMessage(
          {'command': Bite.Constants.CONSOLE_CMDS.GET_JSON_LOCALLY,
           'params': params},
          goog.bind(this.loadTestCallback_, this));
      break;
    case Bite.Constants.UiCmds.LOAD_TEST_FROM_WTF:
      this.messenger_.sendMessage(
          {'command': Bite.Constants.CONSOLE_CMDS.GET_JSON_FROM_WTF,
           'params': params},
          goog.bind(this.loadTestCallback_, this));
      break;
    case Bite.Constants.UiCmds.UPDATE_SCRIPT_AND_DATA:
      this.updateScriptAndData(params['script'], params['data']);
      break;
    case Bite.Constants.UiCmds.UPDATE_WHEN_ON_FAILED:
      this.setPlaybackPause(params['uiOnly']);
      this.playbackRuntimeDialog_.makeChoiceAfterFailure(
          params['failureReason'], params['failureLog']);
      this.editorMngr_.addFailedClass(params['currentStep']);
      break;
    case Bite.Constants.UiCmds.UPDATE_WHEN_RUN_FINISHED:
      this.setPlayStatus(false, params['status']);
      this.updateCurrentStep(-1);
      this.setPlaybackStop(params['uiOnly']);
      this.updatePlaybackStatus(
          'The current playback has been finished.', 'black');
      break;
    case Bite.Constants.UiCmds.OPEN_VALIDATION_DIALOG:
      this.validationDialog_.openValidationDialog(
          params['request']);
      break;
    case Bite.Constants.UiCmds.SET_START_URL:
      this.setStartUrl(params['url']);
      this.setDocString(params['url']);
      break;
    case Bite.Constants.UiCmds.ON_KEY_DOWN:
      this.onKeyDown_(params['event']);
      break;
    case Bite.Constants.UiCmds.ON_KEY_UP:
      this.onKeyUp_(params['event']);
      break;
    case Bite.Constants.UiCmds.ON_CONSOLE_CLOSE:
      this.onConsoleClose_();
      break;
    case Bite.Constants.UiCmds.ON_CONSOLE_REFRESH:
      this.onConsoleRefresh_();
      break;
    case Bite.Constants.UiCmds.ON_SHOW_MORE_INFO:
      this.onShowMoreInfo_();
      break;

    case Bite.Constants.UiCmds.ADD_GENERATED_CMD:
      this.screenshotDialog_.getScreenshotManager().addGeneratedCmd(
          params['cmd']);
      break;
    case Bite.Constants.UiCmds.ADD_NEW_COMMAND:
      this.addNewCommand(
          params['pCmd'],
          params['dCmd'],
          params['index'],
          params['cmdMap']);
      break;
    case Bite.Constants.UiCmds.ADD_SCREENSHOT:
      this.screenshotDialog_.getScreenshotManager().addScreenShot(
          params['dataUrl'],
          params['iconUrl']);
      break;
    case Bite.Constants.UiCmds.RESET_SCREENSHOTS:
      this.screenshotDialog_.getScreenshotManager().resetScreenShots(
          params['screenshots']);
      break;
    case Bite.Constants.UiCmds.UPDATE_SCRIPT_INFO:
      this.updateScriptInfo(
          params['name'],
          params['url'],
          params['script'],
          params['datafile'],
          params['userlib'],
          params['id'],
          params['projectname']);
      break;
    case Bite.Constants.UiCmds.CHANGE_MODE:
      this.changeMode(params['mode']);
      break;
    case Bite.Constants.UiCmds.HIGHLIGHT_LINE:
      var line = this.projectInfo_.getFailureLineNumber(
          params['stepId'], params['testName']);
      if (line >= 0) {
        this.popDescInfoMap_(line);
        this.detailsDialog_.onEditCmd();
      }
      break;
    case Bite.Constants.UiCmds.SHOW_QUICK_CMDS:
      this.showQuickCmds();
      break;
    case Bite.Constants.UiCmds.SHOW_EXPORT:
      this.showExportDialog();
      break;
    case Bite.Constants.UiCmds.SHOW_INFO:
      this.showInfo();
      break;
    case Bite.Constants.UiCmds.LOAD_CMDS:
      this.loadCmds();
      break;
    case Bite.Constants.UiCmds.SHOW_NOTES:
      this.showNotes();
      break;
    case Bite.Constants.UiCmds.START_RECORDING:
      var passChecking = params['passChecking'] || false;
      this.startRecording(passChecking);
      break;
    case Bite.Constants.UiCmds.SHOW_SAVE_DIALOG:
      this.showSaveDialog();
      break;
    case Bite.Constants.UiCmds.SHOW_SCREENSHOT:
      this.showScreenshot();
      break;
    case Bite.Constants.UiCmds.SHOW_SETTING:
      this.showSetting();
      break;
    case Bite.Constants.UiCmds.SHOW_PLAYBACK_RUNTIME:
      this.showPlaybackRuntime();
      break;
    case Bite.Constants.UiCmds.STOP_RECORDING:
      this.stopRecording();
      break;
    case Bite.Constants.UiCmds.START_VALIDATE:
      this.startValidate();
      break;
    case Bite.Constants.UiCmds.START_WORKER_MODE:
      this.startWorkerMode();
      break;
    default:
      break;
  }
};


/**
 * Enum for image path.
 * @enum {string}
 * @export
 */
rpf.ConsoleManager.Images = {
  /* TODO(ralphj): Remove the validation image. */
  VALIDATION: 'imgs/rpf/validation.png',
  RECORD_GREY: 'imgs/rpf/record-disabled.png',
  STOP: 'imgs/rpf/stop.png',
  VALIDATION_GREY: 'imgs/rpf/validation-disabled.png',
  RECORD: 'imgs/rpf/record.png',
  STOP_GREY: 'imgs/rpf/stop-disabled.png',
  VALIDATION_ON: 'imgs/rpf/validationon.png',
  WORKER: 'imgs/rpf/workermode.png',
  WORKER_OFF: 'imgs/rpf/workermodeoff.png'
};


/**
 * Enum for result status.
 * @enum {string}
 * @export
 */
rpf.ConsoleManager.Results = {
  SUCCESS: 'passed',
  STOP: 'stop'
};


/**
 * Enum for buttons.
 * @enum {string}
 * @export
 */
rpf.ConsoleManager.Buttons = {
  ADD_CMD: 'addCmd',
  EXPORT: 'export',
  INFO: 'info',
  LOAD: 'loadTest',
  NOTES: 'notes',
  RECORD: 'record',
  REFRESH: 'refresh',
  SAVE: 'saveTest',
  SCREEN: 'screenShots',
  SETTING: 'setting',
  PLAY: 'startPlayback',
  STOP: 'stop',
  VALIDATE: 'validate',
  WORKER: 'workerMode'
};


/**
 * Updates the element at the given step id.
 * @param {string} stepId The step id.
 * @param {Object} cmdMap The command info map.
 * @param {!Object} originalInfoMap The original script info map.
 * @return {string} The old xpath.
 * @private
 */
rpf.ConsoleManager.prototype.updateElement_ = function(
    stepId, cmdMap, originalInfoMap) {
  var elemId = originalInfoMap['steps'][stepId]['elemId'];
  var elem = originalInfoMap['elems'][elemId];
  var oldXpath = elem['xpaths'][0];
  elem['selectors'] = cmdMap['selectors'];
  elem['xpaths'] = cmdMap['xpaths'];
  elem['descriptor'] = cmdMap['descriptor'];
  elem['iframeInfo'] = cmdMap['iframeInfo'];
  return oldXpath;
};


/**
 * Updates the element at the given step id in a test.
 * @param {string} testName The test name.
 * @param {string} stepId The step id.
 * @param {Object} cmdMap The command info map.
 * @private
 */
rpf.ConsoleManager.prototype.updateElementInTest_ = function(
    testName, stepId, cmdMap) {
  var originalInfoMap = this.projectInfo_.getInfoMapByTest(testName);
  this.updateElement_(stepId, cmdMap, originalInfoMap);
  this.projectInfo_.saveInfoMapToTest(testName, originalInfoMap);
};


/**
 * Updates the element that at the given line with the updated element info
 * captured from the tab under record.
 * @param {number} line The line number.
 * @param {Object} cmdMap The command info map.
 * @param {function(Function, string)} callback The callback function.
 * @private
 */
rpf.ConsoleManager.prototype.updateElementAtLine_ = function(
    line, cmdMap, callback) {
  var lineContent = this.editorMngr_.getTextAtLine(line);
  var stepId = bite.base.Helper.getStepId(lineContent);
  var oldXpath = this.updateElement_(stepId, cmdMap, this.infoMap_ || {});
  var loadFrom = '';
  // If the project was loaded from local, we could update all of the
  // tests and save them back at once. Otherwise, we could only update
  // steps in the particular test for now. The second case includes
  // while creating a new test and loads a test from web.
  if (this.projectInfo_ && this.projectInfo_.getLoadFrom() ==
      rpf.ConsoleManager.LOCAL_) {
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.GET_TEST_NAMES_LOCALLY,
         'params': {'project': this.loaderDialog_.getProjectName()}},
        goog.bind(this.showElementsAfterProjectUpdated_, this,
                  callback, cmdMap, oldXpath));
  } else {
    var data = this.getStepsFromInfoMap_(
        this.getTestName_(), this.infoMap_, oldXpath);
    this.showElementsWithSameXpath_(
        data, rpf.ConsoleManager.WEB_, callback, cmdMap);
  }
};


/**
 * When the local project is updated, show the steps with the same xpath.
 * @param {function(Function, string)} callback The callback function.
 * @param {Object} cmdMap The command info map.
 * @param {string} oldXpath The old xpath.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.showElementsAfterProjectUpdated_ = function(
    callback, cmdMap, oldXpath, response) {
  this.setProjectInfo(
      response['tests'], rpf.ConsoleManager.LOCAL_, response['details']);
  var data = this.getStepsWithSameXpath_(oldXpath);
  this.showElementsWithSameXpath_(
      data, rpf.ConsoleManager.LOCAL_, callback, cmdMap);
};


/**
 * Shows the steps that are with the same xpath.
 * @param {Object} data The data of the steps.
 * @param {string} loadFrom Where the project was loaded from.
 * @param {function(Function, string)} callback The callback function.
 * @param {Object} cmdMap The command info map.
 * @private
 */
rpf.ConsoleManager.prototype.showElementsWithSameXpath_ = function(
    data, loadFrom, callback, cmdMap) {
  if (!data) {
    return;
  }
  var html = element.helper.Templates.locatorsUpdater.
      showElementsWithSameXpath({'data': data, 'loadFrom': loadFrom});
  callback(goog.bind(this.registerEventsOnSameElements_, this, cmdMap), html);
};


/**
 * Registers events on replace and cancel buttons.
 * @param {Object} newCmdMap The new command's map info.
 * @param {function()} onCancelHandler The handler to cancel the update.
 * @private
 */
rpf.ConsoleManager.prototype.registerEventsOnSameElements_ = function(
    newCmdMap, onCancelHandler) {
  this.updateAllHandler_.listen(
      goog.dom.getElement('replaceAllXpaths'),
      goog.events.EventType.CLICK,
      goog.bind(this.handleReplaceButton_, this, newCmdMap, onCancelHandler));
  this.updateAllHandler_.listen(
      goog.dom.getElement('cancelReplaceXpaths'),
      goog.events.EventType.CLICK,
      goog.bind(this.handleCancelButton_, this, onCancelHandler));
};


/**
 * Replace button handler.
 * @param {Object} newCmdMap The new command map.
 * @param {function()} onCancelHandler The handler to cancel the update.
 * @private
 */
rpf.ConsoleManager.prototype.handleReplaceButton_ = function(
    newCmdMap, onCancelHandler) {
  var selectedSteps = goog.dom.getDocument().getElementsByName('selectedSteps');
  for (var i = 0, len = selectedSteps.length; i < len; ++i) {
    if (selectedSteps[i].checked) {
      var nameAndStep = selectedSteps[i].value.split('___');
      if (this.projectInfo_ && this.projectInfo_.getLoadFrom() ==
          rpf.ConsoleManager.LOCAL_) {
        this.updateElementInTest_(nameAndStep[0], nameAndStep[1], newCmdMap);
      } else {
        this.updateElement_(nameAndStep[1], newCmdMap, this.infoMap_ || {});
      }
    }
  }
  // In this case, we need to load the project from local first to make sure
  // it's the latest code before modifing the tests.
  if (this.projectInfo_ && this.projectInfo_.getLoadFrom() ==
      rpf.ConsoleManager.LOCAL_) {
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.SAVE_PROJECT_LOCALLY,
         'params': {'project': {'name': this.loaderDialog_.getProjectName(),
                                'tests': this.projectInfo_.getTests()}}});
  }
  this.handleCancelButton_(onCancelHandler);
};


/**
 * Cancel button handler.
 * @param {function()} onCancelHandler The handler to cancel the update.
 * @private
 */
rpf.ConsoleManager.prototype.handleCancelButton_ = function(onCancelHandler) {
  onCancelHandler();
  this.updateAllHandler_.removeAll();
};


/**
 * Gets the steps with the same xpath in the current opened project.
 * @param {string} oldXpath The old xpath.
 * @return {Array} The array of steps.
 * @private
 */
rpf.ConsoleManager.prototype.getStepsWithSameXpath_ = function(oldXpath) {
  var allSteps = [];
  var tests = this.projectInfo_.getTests();
  for (var i = 0, len = tests.length; i < len; ++i) {
    var testObj = bite.base.Helper.getTestObject(tests[i]['test']);
    var result = bite.console.Helper.trimInfoMap(testObj['datafile']);
    var testName = testObj['name'];
    var stepsOfTest = this.getStepsFromInfoMap_(
        testName, result['infoMap'], oldXpath);
    if (stepsOfTest) {
      allSteps = allSteps.concat(stepsOfTest);
    }
  }
  if (allSteps.length == 0) {
    return null;
  }
  return allSteps;
};


/**
 * Gets the steps with the same xpath from infoMap.
 * @param {string} testName The test name.
 * @param {Object} infoMap The infoMap of the test.
 * @param {string} oldXpath The old xpath.
 * @return {Array} The array of steps.
 * @private
 */
rpf.ConsoleManager.prototype.getStepsFromInfoMap_ = function(
    testName, infoMap, oldXpath) {
  var allSteps = [];
  var steps = infoMap['steps'];
  var elems = infoMap['elems'];
  for (var step in steps) {
    var elemId = steps[step]['elemId'];
    var elem = elems[elemId];
    if (elem && elem['xpaths'][0] == oldXpath) {
      allSteps.push({'testName': testName,
                     'stepName': steps[step]['stepName'],
                     'elemId': elemId});
    }
  }
  if (allSteps.length == 0) {
    return null;
  }
  return allSteps;
};


/**
 * @param {string} action The action to be logged in console.
 * @param {string} label The label string.
 * @private
 */
rpf.ConsoleManager.logEvent_ = function(action, label) {
  chrome.extension.sendRequest({'action': Bite.Constants.HUD_ACTION.LOG_EVENT,
                                'category': 'ConsoleManager',
                                'event_action': action,
                                'label': label});
};


/**
 * Sets the doc string.
 * @param {string} url The url.
 * @export
 */
rpf.ConsoleManager.prototype.setDocString = function(url) {
  var domain = new goog.Uri(url).getDomain();
  var docString = bite.console.Helper.getDocString(domain, this.userId_);
  this.editorMngr_.setCode(docString + this.editorMngr_.getCode());
};


/**
 * @return {boolean} Whether or not is recording.
 * @export
 */
rpf.ConsoleManager.prototype.isRecording = function() {
  return this.isRecording_;
};


/**
 * @return  {boolean} Whether or not is playing back.
 * @export
 */
rpf.ConsoleManager.prototype.isPlaying = function() {
  return this.isPlaying_;
};


/**
 * @return {Bite.Constants.ConsoleModes} The current mode.
 * @export
 */
rpf.ConsoleManager.prototype.getMode = function() {
  return this.mode_;
};


/**
 * @return {Object} The buttons displayed on console UI.
 * @export
 */
rpf.ConsoleManager.prototype.getButtons = function() {
  return this.btns_;
};


/**
 * @return {rpf.ConsoleManager.ModeInfo} The modeInfo static object.
 * @export
 */
rpf.ConsoleManager.prototype.getModeInfo = function() {
  return this.modeInfo_;
};


/**
 * @return {number} The line number that should be highlighted.
 * @export
 */
rpf.ConsoleManager.prototype.getLineHighlighted = function() {
  return this.lineHighlighted_;
};


/**
 * @return {Object} The mode selector.
 * @export
 */
rpf.ConsoleManager.prototype.getModeSelector = function() {
  return this.modeSelector_;
};


/**
 * @return {Bite.Constants.ViewModes} The current view mode.
 * @export
 */
rpf.ConsoleManager.prototype.getViewMode = function() {
  return this.viewMode_;
};


/**
 * @return {number} The line to be inserted.
 * @export
 */
rpf.ConsoleManager.prototype.getLineToInsert = function() {
  return this.lineToInsert_;
};


/**
 * @param {number} line The line to be inserted.
 * @export
 */
rpf.ConsoleManager.prototype.setLineToInsert = function(line) {
  this.lineToInsert_ = line;
};


/**
 * @return {rpf.EditorManager} The editor manager.
 * @export
 */
rpf.ConsoleManager.prototype.getEditorManager = function() {
  return this.editorMngr_;
};


/**
 * @return {rpf.ExportDialog} The loader dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getExportDialog = function() {
  return this.exportDialog_;
};


/**
 * @return {rpf.LoaderDialog} The loader dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getLoaderDialog = function() {
  return this.loaderDialog_;
};


/**
 * @return {rpf.SaveDialog} The save dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getSaveDialog = function() {
  return this.saveDialog_;
};


/**
 * @return {rpf.ValidateDialog} The validation dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getValidationDialog = function() {
  return this.validationDialog_;
};


/**
 * @return {rpf.NotesDialog} The notes dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getNotesDialog = function() {
  return this.notesDialog_;
};


/**
 * @return {rpf.DetailsDialog} The details dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getDetailsDialog = function() {
  return this.detailsDialog_;
};


/**
 * @return {rpf.PlayDialog} The playback dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getPlaybackRuntimeDialog = function() {
  return this.playbackRuntimeDialog_;
};


/**
 * @return {rpf.ScreenShotDialog} The screenshot dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getScreenshotDialog = function() {
  return this.screenshotDialog_;
};


/**
 * @return {rpf.SettingDialog} The setting dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getSettingDialog = function() {
  return this.settingDialog_;
};


/**
 * @return {rpf.QuickCmdDialog} The quick commands dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getQuickDialog = function() {
  return this.quickDialog_;
};


/**
 * @return {rpf.InfoDialog} The info dialog.
 * @export
 */
rpf.ConsoleManager.prototype.getInfoDialog = function() {
  return this.infoDialog_;
};


/**
 * Pops up the detailed info dialog.
 * @param {Object} e The event object.
 * @private
 */
rpf.ConsoleManager.prototype.popupDetailedInfo_ = function(e) {
  var currentLineNumber = this.editorMngr_.getCurrentSelection().start['row'];
  this.popDescInfoMap_(currentLineNumber);
};


/**
 * Get desc info to pop up.
 * @param {number} lineNum The line number.
 * @return {boolean} Whether pops up the detail info.
 * @private
 */
rpf.ConsoleManager.prototype.popDescInfoMap_ = function(lineNum) {
  var desc = '';
  var translation = '';
  var id = '';
  var cmd = this.editorMngr_.getOriginalLineAt(lineNum);
  var xpath = '';

  var descObj = this.editorMngr_.checkHasDesc(lineNum);
  //To support legacy code format.
  if (descObj) {
    desc = descObj['desc'];
    translation = descObj['translation'];
    id = rpf.MiscHelper.getCmdId(cmd);
  } else {
    var elemMap = rpf.MiscHelper.getElemMap(
        this.editorMngr_.getTextAtLine(lineNum), this.infoMap_);
    if (elemMap['xpaths']) {
      // New code format.
      desc = elemMap['descriptor'];
      id = bite.base.Helper.getStepId(cmd);
      xpath = elemMap['xpaths'][0];
    }
  }

  if (desc) {
    this.updateHighlightLine(lineNum);
    this.detailsDialog_.updateInfo(
        desc, lineNum, translation, id, xpath, this.infoMap_);
    return true;
  } else {
    return false;
  }
};


/**
 * Finds the next command has descriptor.
 * @param {number} line The line number.
 * @export
 */
rpf.ConsoleManager.prototype.findNextCmd = function(line) {
  var lineNum = line + 1;
  var totalNum = this.editorMngr_.getTotalLineCount();
  for (var i = lineNum; i <= totalNum; i++) {
    if (this.popDescInfoMap_(i)) {
      return;
    }
  }
};


/**
 * Finds the previous command which has descriptor.
 * @param {number} line The line number.
 * @export
 */
rpf.ConsoleManager.prototype.findPrevCmd = function(line) {
  var lineNum = line - 1;
  if (lineNum < 0) {
    return;
  }
  for (var i = lineNum; i >= 0; i--) {
    if (this.popDescInfoMap_(i)) {
      return;
    }
  }
};


/**
 * Logs info on console.
 * @param {string} log Log string.
 * @param {rpf.ConsoleLogger.LogLevel=} opt_level Log level.
 * @param {rpf.ConsoleLogger.Color=} opt_color Log color.
 * @export
 */
rpf.ConsoleManager.prototype.logInfo = function(log, opt_level, opt_color) {
  var level = opt_level || rpf.ConsoleLogger.LogLevel.INFO;
  var color = opt_color || rpf.ConsoleLogger.Color.BLACK;
  console.log('On console side: ' + log);
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONSOLE_CMDS.SAVE_LOG_AND_HTML,
       'params': {'log': log,
                  'level': level,
                  'color': color}});
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONSOLE_CMDS.GET_LOGS_AS_STRING,
       'params': {}},
      goog.bind(this.updateLogDialog_, this));
};


/**
 * Sets the console status.
 * @param {string} status Status string.
 * @param {string=} opt_color Status color.
 * @export
 */
rpf.ConsoleManager.prototype.setStatus = function(status, opt_color) {
  if (this.noConsole_) {
    return;
  }
  var color = opt_color || 'blue';
  var statusDiv = '<div style="color:' + color + '">' +
                  status + '</div>';
  goog.dom.getElement(Bite.Constants.RpfConsoleId.ELEMENT_STATUS).innerHTML =
      statusDiv;
};


/**
 * Updates the log dialog.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.updateLogDialog_ = function(response) {
  goog.dom.getElement('logs').innerHTML = response['logHtml'];
};


/**
 * Opens the validation dialog.
 * @param {Object} request The relevant info of an element.
 * @export
 */
rpf.ConsoleManager.prototype.openValidationDialog = function(request) {
  this.validationDialog_.openValidationDialog(request);
  this.validationDialog_.setVisible(true);
};


/**
 * Updates the playback status.
 * @param {string} status The status string.
 * @param {string} color The color code.
 * @export
 */
rpf.ConsoleManager.prototype.updatePlaybackStatus = function(status, color) {
  this.playbackRuntimeDialog_.updatePlaybackStatus(status, color);
};


/**
 * Adds a new created command in the UI.
 * @param {string} cmd The generated command.
 * @param {string} data The data string.
 * @export
 */
rpf.ConsoleManager.prototype.addNewCreatedCmdInBox = function(cmd, data) {
  goog.dom.getElement('newCmdBox').value = cmd;
  this.playbackRuntimeDialog_.tempCmd = cmd;
  this.playbackRuntimeDialog_.tempData = data;
};


/**
 * Pauses playback.
 * @param {boolean=} opt_uiOnly Whether to involve the call to
 *     the backend.
 * @export
 */
rpf.ConsoleManager.prototype.setPlaybackPause = function(opt_uiOnly) {
  this.playbackRuntimeDialog_.setPlaybackPause(opt_uiOnly);
};


/**
 * Stops playback.
 * @param {boolean=} opt_uiOnly Whether to involve the call to
 *     the backend.
 * @export
 */
rpf.ConsoleManager.prototype.setPlaybackStop = function(opt_uiOnly) {
  this.playbackRuntimeDialog_.setPlaybackStop(opt_uiOnly);
};


/**
 * Sets the project info.
 * @param {Array} tests The test array.
 * @param {string} loadFrom Either from web or local.
 * @param {Object=} opt_details The optional details of the project.
 */
rpf.ConsoleManager.prototype.setProjectInfo = function(
    tests, loadFrom, opt_details) {
  this.projectInfo_.setTests(tests);
  this.projectInfo_.setLoadFrom(loadFrom);
  this.projectInfo_.setDetails(opt_details);
};


/**
 * Updates the editor highlighted line.
 * @param {number} line Line number.
 * @export
 */
rpf.ConsoleManager.prototype.updateHighlightLine = function(line) {
  this.lineHighlighted_ = line;
  this.editorMngr_.clearGutterDecoration();
  if (line >= 0) {
    this.editorMngr_.addRunningClass(line);
  }
};


/**
 * Updates the current step in UI.
 * @param {number} curStep Current step.
 * @export
 */
rpf.ConsoleManager.prototype.updateCurrentStep = function(curStep) {
  var currentStep = '';
  this.editorMngr_.clearGutterDecoration();
  if (curStep >= 0) {
    for (var i = 0; i < curStep; i++) {
      this.editorMngr_.addPassedClass(i);
    }
    this.editorMngr_.addRunningClass(curStep);
    currentStep = curStep + 1 + '';
  }
  goog.dom.getElement('playbackcurrentstep').value = currentStep;
};


/**
 * Gets the to-be inserted line number.
 * @return {number} The line to be inserted.
 * @export
 */
rpf.ConsoleManager.prototype.getInsertLineNum = function() {
  if (this.lineToInsert_ != -1) {
    return this.lineToInsert_;
  } else {
    return this.editorMngr_.getTotalLineCount() - 1;
  }
};


/**
 * Adds a new generated command in console text fields.
 * @param {string} pCmd The generated puppet command.
 * @param {string=} opt_dCmd The generated data command (optional).
 * @param {number=} opt_index Add the commmand at the given line.
 * @param {Object=} opt_cmdMap The command map.
 * @export
 */
rpf.ConsoleManager.prototype.addNewCommand = function(
    pCmd, opt_dCmd, opt_index, opt_cmdMap) {
  // Save new command, if no rpf Console UI is constructed.
  if (this.noConsole_) {
    this.recordedScript_ += pCmd;
    return;
  }

  var dCmd = opt_dCmd || '';
  var code = this.editorMngr_.getTempCode();
  if (this.viewMode_ == Bite.Constants.ViewModes.CODE) {
    code = this.editorMngr_.getCode();
  }

  var scnshotId = goog.string.getRandomString();
  if (opt_cmdMap) {
    scnshotId = opt_cmdMap['id'];
    bite.console.Helper.assignInfoMap(this.infoMap_, opt_cmdMap);
  }

  var newCode = '';
  if (this.lineToInsert_ != -1) {
    var allLines = code.split('\n');
    allLines.splice(this.lineToInsert_, 0, pCmd);
    newCode = allLines.join('\n');
    this.lineToInsert_ += 1;
  } else {
    newCode = code + pCmd + '\n';
  }
  if (opt_index && opt_index == -1) {
    // TODO(phu): Optimize the way to get screenshots.
    this.screenshotDialog_.getScreenshotManager().addIndex(scnshotId);
  }
  this.addNewData_(dCmd);
  if (this.viewMode_ == Bite.Constants.ViewModes.CODE) {
    this.editorMngr_.setCode(newCode);
  } else {
    this.editorMngr_.setTempCode(newCode);
    this.editorMngr_.setReadableCode();
  }
  if (this.isPlaying_) {
    console.log('Will try to insert the generated line in playback script.');
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.INSERT_CMDS_WHILE_PLAYBACK,
         'params': {'scriptStr': pCmd,
                    'data': dCmd}});
  }
};


/**
 * Adds the new data in datafile.
 * @param {string=} opt_dCmd The generated data command.
 * @private
 */
rpf.ConsoleManager.prototype.addNewData_ = function(opt_dCmd) {
  if (opt_dCmd) {
    var curDataValue = this.getDatafile_();
    this.setDatafile_(curDataValue + opt_dCmd + '\n');
  }
};


/**
 * Shows the notes dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showNotes = function() {
  rpf.ConsoleManager.logEvent_('Notes', '');
  this.notesDialog_.setVisible(true);
};


/**
 * Shows the playback runtime dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showPlaybackRuntime = function() {
  rpf.ConsoleManager.logEvent_('Play', 'IS_RECORDING: ' + this.isRecording_);

  if (this.isRecording_) {
    this.setStatus('Can not playback while recording.', 'red');
    throw new Error('Can not play back during recording.');
  }
  this.playbackRuntimeDialog_.setVisible(true);
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.PLAYBACK_DIALOG_OPENED);
};


/**
 * Shows the screenshot dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showScreenshot = function() {
  rpf.ConsoleManager.logEvent_('ShowScreenshot', '');
  this.screenshotDialog_.setVisible(true);
};


/**
 * Shows the setting dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showSetting = function() {
  rpf.ConsoleManager.logEvent_('Setting', '');
  this.settingDialog_.setVisible(true);
};


/**
 * Shows the quick commands dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showQuickCmds = function() {
  rpf.ConsoleManager.logEvent_('AddComds', '');
  this.quickDialog_.setVisible(true);
};


/**
 * Shows the info dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showInfo = function() {
  rpf.ConsoleManager.logEvent_('Info', '');
  this.infoDialog_.setVisible(true);
};


/**
 * Shows the save dialog up.
 * @export
 */
rpf.ConsoleManager.prototype.showSaveDialog = function() {
  rpf.ConsoleManager.logEvent_('Save', '');

  this.saveDialog_.setVisible(true);
};


/**
 * Gets the user lib if there is one.
 * @return {Object} User's own lib string.
 * @export
 */
rpf.ConsoleManager.prototype.getUserLib = function() {
  return this.notesDialog_.getUserLib();
};


/**
 * Opens the project export dialog.
 */
rpf.ConsoleManager.prototype.showExportDialog = function() {
  rpf.ConsoleManager.logEvent_('Export', '');

  this.exportDialog_.setVisible(true);
};


/**
 * Opens the tests loader dialog.
 * @export
 */
rpf.ConsoleManager.prototype.loadCmds = function() {
  rpf.ConsoleManager.logEvent_('Load', '');

  this.loaderDialog_.setVisible(true);
};


/**
 * Updates the script related information.
 * @param {string} name The test name.
 * @param {string} url The test start URL.
 * @param {string} script The test content.
 * @param {string} datafile The test input data.
 * @param {string} userLib The user's own lib.
 * @param {string=} opt_id The test id.
 * @param {string=} opt_projectName The project name.
 * @export
 */
rpf.ConsoleManager.prototype.updateScriptInfo = function(
    name, url, script, datafile, userLib, opt_id,
    opt_projectName) {
  this.expandZippy_();
  var projectName = opt_projectName || '';
  this.setTestName_(name, false);
  this.setTestName_(name, true);
  goog.dom.getElement(Bite.Constants.RpfConsoleId.ELEMENT_TEST_ID).value =
      opt_id;
  this.setStartUrl(url);


  var result = bite.console.Helper.trimInfoMap(datafile);
  this.setDatafile_(result['datafile']);
  this.infoMap_ = result['infoMap'];

  if (this.viewMode_ == Bite.Constants.ViewModes.CODE) {
    this.editorMngr_.setCode(script);
    this.editorMngr_.setTempCode('');
  } else if (this.viewMode_ == Bite.Constants.ViewModes.READABLE) {
    this.editorMngr_.setTempCode(script);
    this.editorMngr_.setReadableCode();
  }
  this.notesDialog_.setUserLib(userLib);
  goog.dom.getElement(Bite.Constants.RpfConsoleId.CONSOLE_PROJECT_NAME).value =
      projectName;
  console.log('  Finished loading up the new script!');
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.FINISHED_LOAD_TEST_IN_CONSOLE);
};


/**
 * Updates script and data in console.
 * @param {string} script The test content.
 * @param {string} data The test input data.
 * @export
 */
rpf.ConsoleManager.prototype.updateScriptAndData = function(script, data) {
  this.editorMngr_.setCode(script);
  this.setDatafile_(data);
};


/**
 * Gets the datafile content.
 * @return {string} The datafile string.
 * @private
 */
rpf.ConsoleManager.prototype.getDatafile_ = function() {
  return goog.dom.getElement(Bite.Constants.RpfConsoleId.DATA_CONTAINER).value;
};


/**
 * Sets the datafile content.
 * @param {string} value The datafile string.
 * @private
 */
rpf.ConsoleManager.prototype.setDatafile_ = function(value) {
  goog.dom.getElement(Bite.Constants.RpfConsoleId.DATA_CONTAINER).value = value;
};


/**
 * Checks if the current script is runnable.
 * @return {boolean} Whether or not the script is runnable.
 * @private
 */
rpf.ConsoleManager.prototype.checkRunnable_ = function() {
  if (this.noConsole_) {
    return true;
  }
  var startUrl = this.getStartUrl();
  var scripts = this.editorMngr_.getCode();
  return goog.string.trim(startUrl) != '' && goog.string.trim(scripts) != '';
};


/**
 * Playbacks the test in the console.
 * @param {Bite.Constants.PlayMethods} method Method of playback.
 * @param {string=} opt_script The script to play.
 * @export
 */
rpf.ConsoleManager.prototype.startPlayback = function(method, opt_script) {
  console.log('rpf.ConsoleManager.prototype.startPlayback');
  if (this.isRecording_) {
    this.setStatus('Can not playback while recording.', 'red');
    throw new Error('Can not play back during recording.');
  }
  var testNames = this.playbackRuntimeDialog_.getSelectedTests();
  // The current logic is to use the "multiple replay" mode when there
  // are multiple tests selected, or single test which is the same one
  // currently loaded in the console.
  if (testNames.length > 1 ||
      (testNames.length == 1 && testNames[0] != this.getTestName_())) {
    this.playbackRuntimeDialog_.setFinishedNumber(0);
    this.playbackRuntimeDialog_.setTotalNumber(testNames.length);
    this.playbackRuntimeDialog_.setMultipleTestsVisibility(true);
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.RUN_GROUP_TESTS,
         'params': {'testNames': testNames,
                    'tests': this.projectInfo_.getTests(),
                    'runName': this.loaderDialog_.getProjectName(),
                    'location': this.loaderDialog_.getStorageLocation()}});
    return;
  }
  if (this.checkRunnable_()) {
    this.playbackRuntimeDialog_.setMultipleTestsVisibility(false);
    var scripts = opt_script ? opt_script : this.editorMngr_.getTempCode() ||
                  this.editorMngr_.getCode();
    if (this.noConsole_) {
      var datafile = '';
      var startUrl = goog.global.location.href;
      var userLib = '';
      var needOverride = '';
    } else {
      var datafile = this.getDatafile_();
      var startUrl = goog.string.trim(this.getStartUrl());
      var userLib = this.getUserLib()['script'];
      var needOverride = this.getUserLib()['needOverride'];
      this.playbackRuntimeDialog_.clearMatchHtml();
    }
    this.setPlayStatus(true);
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.CHECK_PLAYBACK_OPTION_AND_RUN,
         'params': {'method': method,
                    'startUrl': startUrl,
                    'scripts': scripts,
                    'infoMap': this.infoMap_,
                    'datafile': datafile,
                    'userLib': userLib,
                    'needOverride': needOverride,
                    'noConsole': this.noConsole_}},
        goog.bind(this.callbackOnStartPlayback_, this));
  } else {
    this.setStatus(
        'Please check all the additional script info are filled.', 'red');
    throw new Error('Error: Necessary fields were not all filled.');
  }
};


/**
 * The callback for starting playback.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.callbackOnStartPlayback_ = function(response) {
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.PLAYBACK_STARTED);
  if (response['isPrepDone'] && !this.noConsole_) {
    this.playbackRuntimeDialog_.switchChoiceSet(false);
  }
};


/**
 * Starts recording user's interactions.
 * @param {boolean=} opt_pass Whether pass the isPlaying_ checking.
 * @export
 */
rpf.ConsoleManager.prototype.startRecording = function(opt_pass) {
  this.expandZippy_();
  rpf.ConsoleManager.logEvent_('Record', 'IS_PLAYING: ' + this.isPlaying_);
  var pass = opt_pass || false;

  if (this.isPlaying_ && !pass) {
    this.setStatus('Can not record while playing back a script.', 'red');
    throw new Error('Can not record during playing back.');
  }

  if (!this.noConsole_) {
    var recordImg = goog.dom.getElement('record');
    if (recordImg) {
      var recordGrey =
          recordImg.src.indexOf(rpf.ConsoleManager.Images.RECORD_GREY);
      if (recordGrey == -1) {
        goog.dom.getElement('validate').src =
            rpf.ConsoleManager.Images.VALIDATION;
        recordImg.src = rpf.ConsoleManager.Images.RECORD_GREY;
        goog.dom.getElement('stop').src = rpf.ConsoleManager.Images.STOP;
        this.setRecordStatus(true);
        this.changeMode(Bite.Constants.ConsoleModes.RECORD);
        var url = goog.string.trim(this.getStartUrl());
        this.messenger_.sendMessage(
            {'command': Bite.Constants.CONSOLE_CMDS.START_RECORDING,
             'params': {'url': url,
                        'info': {'pageMap': this.projectInfo_.getPageMap()}}});
      }
    }
  } else {
    var url = goog.global.location.href;
    this.messenger_.sendMessage(
      {'command': Bite.Constants.CONSOLE_CMDS.START_RECORDING,
       'params': {'url': url, 'noConsole': this.noConsole_}});
  }
};


/**
 * Callback for saving the script in the cloud.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.saveTestCallback_ = function(response) {
  this.statusLogger_.setStatus(response['message'], response['color']);
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.TEST_SAVED);
};


/**
 * Callback for loading the script in the cloud.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.loadTestCallback_ = function(response) {
  this.statusLogger_.setStatus(response['message'], response['color']);
  this.changeMode(Bite.Constants.ConsoleModes.VIEW);
  this.loaderDialog_.setVisible(false);
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.TEST_LOADED);
};


/**
 * Callback for loading the project.
 * @param {Object} response The response object.
 * @private
 */
rpf.ConsoleManager.prototype.loadProjectCallback_ = function(response) {
  this.statusLogger_.setStatus(response['message'], response['color']);
  this.loaderDialog_.setVisible(false);
  this.messenger_.sendStatusMessage(
      Bite.Constants.COMPLETED_EVENT_TYPES.PROJECT_LOADED);
};


/**
 * Saves the script locally or in the cloud.
 * @export
 */
rpf.ConsoleManager.prototype.saveTest = function() {
  var testName = 'testName';
  var startUrl = goog.global.location.href;
  var scripts = this.recordedScript_;
  var datafile = 'datafile';
  var userLib = 'userLib';
  var projectName = 'projectName';
  var needOverride = true;
  var saveWeb = true;

  if (!this.noConsole_) {
    testName = this.getTestName_();
    saveWeb = goog.dom.getElement('webBox').checked;
    startUrl = this.getStartUrl();
    datafile = this.getDatafile_();
    datafile = bite.console.Helper.appendInfoMap(this.infoMap_, datafile);
    projectName = goog.dom.getElement(
        Bite.Constants.RpfConsoleId.CONSOLE_PROJECT_NAME).value;
    var userLibObj = this.getUserLib();
    userLib = userLibObj['script'];
    needOverride = userLibObj['needOverride'];
    scripts = this.editorMngr_.getTempCode() ||
        this.getEditorManager().getCode();
  }

  var screenshots = {};
  var screenshotMgr = this.getScreenshotDialog().getScreenshotManager();
  var scrShots = screenshotMgr.getScreenshots();
  var scrSteps = screenshotMgr.getCmdIndices();
  for (var i = 0; i < scrShots.length; i++) {
    screenshots[scrSteps[i]] = {};
    screenshots[scrSteps[i]]['index'] = scrSteps[i];
    screenshots[scrSteps[i]]['data'] = scrShots[i];
  }
  if (goog.string.trim(testName)) {
    try {
      if (saveWeb) {
        this.messenger_.sendMessage(
            {'command': Bite.Constants.CONSOLE_CMDS.UPDATE_ON_WEB,
             'params': {'testName': testName,
                        'startUrl': startUrl,
                        'scripts': scripts,
                        'datafile': datafile,
                        'userLib': userLib,
                        'projectName': projectName,
                        'screenshots': screenshots,
                        'needOverride': needOverride,
                        'noConsole': this.noConsole_}},
             goog.bind(this.saveTestCallback_, this));
      } else {
        this.messenger_.sendMessage(
          {'command': Bite.Constants.CONSOLE_CMDS.SAVE_JSON_LOCALLY,
           'params': {'testName': testName,
                      'startUrl': startUrl,
                      'scripts': scripts,
                      'datafile': datafile,
                      'userLib': userLib,
                      'projectName': projectName,
                      'needOverride': needOverride}},
          goog.bind(this.saveTestCallback_, this));
      }
      console.log('successfully saved.');
      // Set status in rpf Console UI.
      if (!this.noConsole_) {
        this.statusLogger_.setStatus(rpf.StatusLogger.SAVING, 'yellow');
        this.saveDialog_.setVisible(false);
      }
    } catch (e) {
      // Set status in rpf Console UI.
      if (!this.noConsole_) {
        this.setStatus('Failed saving because: ' + e.toString(), 'red');
      }
      throw new Error(e);
    }
  } else {
    this.setStatus('Please give the script a name first.', 'red');
    throw new Error('Error: Did not name the test.');
  }
};


/**
 * Sets the recording status.
 * @param {boolean} recording Whether or not is recording.
 * @export
 */
rpf.ConsoleManager.prototype.setRecordStatus = function(recording) {
  if (recording) {
    this.statusLogger_.setStatus(rpf.StatusLogger.START_RECORDING);
    this.isRecording_ = true;
  } else {
    this.statusLogger_.setStatus(rpf.StatusLogger.STOP_RECORDING);
    this.isRecording_ = false;
  }
};


/**
 * Sets the palyback status.
 * @param {boolean} playing Whether or not is playing back.
 * @param {string=} opt_result The result.
 * @export
 */
rpf.ConsoleManager.prototype.setPlayStatus = function(playing, opt_result) {
  var result = opt_result || '';
  if (playing) {
    this.statusLogger_.setStatus(rpf.StatusLogger.START_PLAYBACK);
    this.isPlaying_ = true;
    this.changeMode(Bite.Constants.ConsoleModes.PLAY);
  } else {
    if (opt_result.indexOf(rpf.ConsoleManager.Results.SUCCESS) != -1) {
      this.statusLogger_.setStatus(rpf.StatusLogger.PLAYBACK_SUCCESS, 'green');
    } else if (opt_result.indexOf(rpf.ConsoleManager.Results.STOP) != -1) {
      this.statusLogger_.setStatus(rpf.StatusLogger.PLAYBACK_STOPPED, 'brown');
    } else {
      this.statusLogger_.setStatus(rpf.StatusLogger.PLAYBACK_FAILED, 'red');
    }
    this.isPlaying_ = false;
    if (this.mode_ != Bite.Constants.ConsoleModes.WORKER) {
      this.changeMode(Bite.Constants.ConsoleModes.VIEW);
    }
  }
};


/**
 * Stops recording.
 * @export
 */
rpf.ConsoleManager.prototype.stopRecording = function() {
  rpf.ConsoleManager.logEvent_('Stop', '');
  // Just send message to stop recording, if no rpf Console UI is constructed.
  if (this.noConsole_) {
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.STOP_RECORDING});
    return;
  }

  var stopElement = goog.dom.getElement('stop');
  if (stopElement.src.indexOf(rpf.ConsoleManager.Images.STOP_GREY) == -1) {
    goog.dom.getElement('validate').src =
        rpf.ConsoleManager.Images.VALIDATION_GREY;
    goog.dom.getElement('record').src =
        rpf.ConsoleManager.Images.RECORD;
    stopElement.src = rpf.ConsoleManager.Images.STOP_GREY;
    this.setRecordStatus(false);
    this.changeMode(Bite.Constants.ConsoleModes.VIEW);
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONSOLE_CMDS.STOP_RECORDING});
  }
};


/**
 * Starts validation mode.
 * @return {boolean} Whether or not a pass.
 * @export
 */
rpf.ConsoleManager.prototype.startValidate = function() {
  rpf.ConsoleManager.logEvent_('Validate', '');
  var validateSrc = goog.dom.getElement('validate').src;
  if (validateSrc.indexOf(rpf.ConsoleManager.Images.VALIDATION_GREY) != -1) {
    return false;
  }
  if (validateSrc.indexOf('validationon') != -1) {
    goog.dom.getElement('validate').src =
        rpf.ConsoleManager.Images.VALIDATION;
  } else {
    goog.dom.getElement('validate').src =
        rpf.ConsoleManager.Images.VALIDATION_ON;
  }
  return true;
};


/**
 * Enters worker mode.
 * @export
 */
rpf.ConsoleManager.prototype.startWorkerMode = function() {
  rpf.ConsoleManager.logEvent_('StartWorker', '');
  var workerSrc = goog.dom.getElement(rpf.ConsoleManager.Buttons.WORKER).src;
  if (workerSrc.indexOf('workermodeoff') != -1) {
    goog.dom.getElement(rpf.ConsoleManager.Buttons.WORKER).src =
        rpf.ConsoleManager.Images.WORKER;
    this.stopWorkerMode();
    this.changeMode(Bite.Constants.ConsoleModes.VIEW);
  } else {
    goog.dom.getElement(rpf.ConsoleManager.Buttons.WORKER).src =
        rpf.ConsoleManager.Images.WORKER_OFF;
    this.messenger_.sendMessage(
        {'command': Bite.Constants.CONTROL_CMDS.START_WORKER_MODE});
    this.changeMode(Bite.Constants.ConsoleModes.WORKER);
  }
};


/**
 * Stops worker mode.
 * @export
 */
rpf.ConsoleManager.prototype.stopWorkerMode = function() {
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONTROL_CMDS.STOP_WORKER_MODE});
};


/**
 * Sets the test start URL.
 * @param {string} url The test start URL.
 * @export
 */
rpf.ConsoleManager.prototype.setStartUrl = function(url) {
  goog.dom.getElement(Bite.Constants.RpfConsoleId.ELEMENT_START_URL).value =
      url;
};


/**
 * Gets the test start URL.
 * @return {string} The start url.
 * @export
 */
rpf.ConsoleManager.prototype.getStartUrl = function() {
  return goog.dom.getElement(
      Bite.Constants.RpfConsoleId.ELEMENT_START_URL).value;
};


/**
 * Sets the test name.
 * @param {string} name The test name.
 * @param {boolean} readOnly Whether to set the read only field.
 * @private
 */
rpf.ConsoleManager.prototype.setTestName_ = function(name, readOnly) {
  var surfix = readOnly ? '_readonly' : '';
  goog.dom.getElement(
      Bite.Constants.RpfConsoleId.ELEMENT_TEST_NAME + surfix).value = name;
};


/**
 * Gets the test name.
 * @return {string} The test name.
 * @private
 */
rpf.ConsoleManager.prototype.getTestName_ = function() {
  return goog.dom.getElement(
      Bite.Constants.RpfConsoleId.ELEMENT_TEST_NAME).value;
};


/**
 * A class for handling flux modes info.
 * @constructor
 * @export
 */
rpf.ConsoleManager.ModeInfo = function() {
  /**
   * Mode and Buttons.
   * @type Object
   */
  this.modeAndBtns = {};
  this.modeAndBtns[Bite.Constants.ConsoleModes.IDLE] =
      {'desc': 'Load a script or begin recording to create a new one',
       'btns': [rpf.ConsoleManager.Buttons.LOAD,
                rpf.ConsoleManager.Buttons.PLAY,
                rpf.ConsoleManager.Buttons.RECORD,
                rpf.ConsoleManager.Buttons.EXPORT,
                rpf.ConsoleManager.Buttons.SETTING,
                rpf.ConsoleManager.Buttons.REFRESH]};

  this.modeAndBtns[Bite.Constants.ConsoleModes.RECORD] =
      {'desc': 'Take actions in the browser to record them as javascript',
       'btns': [rpf.ConsoleManager.Buttons.STOP,
                rpf.ConsoleManager.Buttons.SETTING,
                rpf.ConsoleManager.Buttons.REFRESH]};

  this.modeAndBtns[Bite.Constants.ConsoleModes.PLAY] =
      {'desc': 'Play back a previously recorded script',
       'btns': [rpf.ConsoleManager.Buttons.SETTING,
                rpf.ConsoleManager.Buttons.PLAY,
                rpf.ConsoleManager.Buttons.REFRESH]};

  this.modeAndBtns[Bite.Constants.ConsoleModes.DEFINE] = [];
  this.modeAndBtns[Bite.Constants.ConsoleModes.PAUSE] = [];
  this.modeAndBtns[Bite.Constants.ConsoleModes.WORKER] =
      {'desc': 'Serves as a worker, not under your control!',
       'btns': [rpf.ConsoleManager.Buttons.SETTING,
                rpf.ConsoleManager.Buttons.REFRESH]};

  this.modeAndBtns[Bite.Constants.ConsoleModes.UPDATER] =
      {'desc': 'Locator updater mode.',
       'btns': [rpf.ConsoleManager.Buttons.REFRESH]};

  this.modeAndBtns[Bite.Constants.ConsoleModes.VIEW] =
      {'desc': 'Review, modify or run a script',
       'btns': [rpf.ConsoleManager.Buttons.LOAD,
                rpf.ConsoleManager.Buttons.SAVE,
                rpf.ConsoleManager.Buttons.PLAY,
                rpf.ConsoleManager.Buttons.SCREEN,
                rpf.ConsoleManager.Buttons.RECORD,
                rpf.ConsoleManager.Buttons.EXPORT,
                rpf.ConsoleManager.Buttons.SETTING,
                rpf.ConsoleManager.Buttons.REFRESH]};
};


/**
 * The callback function when a key down happens.
 * @param {Object} e The event object.
 * @private
 */
rpf.ConsoleManager.prototype.onKeyDown_ = function(e) {
  switch (e.keyCode) {
    case goog.events.KeyCodes.ALT:
      this.keyAlt_ = true;
      break;
    case goog.events.KeyCodes.S:
      if (this.keyAlt_) {
        if (!this.editorMngr_.getTempCode()) {
          this.modeSelector_.setSelectedIndex(1);
          this.selectViewReadableMode_(null);
        } else {
          this.modeSelector_.setSelectedIndex(0);
          this.selectViewCodeMode_(null);
        }
        this.keyAlt_ = false;
      }
      break;
    case goog.events.KeyCodes.V:
      if (this.keyAlt_) {
        var windowParam = goog.string.buildString(
            'alwaysRaised=yes,',
            'location=no,',
            'resizable=yes,',
            'scrollbars=no,',
            'status=no,width=600,height=800,',
            'left=300,top=100');
        window.open(
            'visualview.html', 'Visual View', windowParam);
        this.keyAlt_ = false;
      }
      break;
  }
};


/**
 * The callback function when a key up happens.
 * @param {Object} e The event object.
 * @private
 */
rpf.ConsoleManager.prototype.onKeyUp_ = function(e) {
  if (e.keyCode == goog.events.KeyCodes.ALT) {
    this.keyAlt_ = false;
  }
};


/**
 * Callback function for selecting code mode.
 * @param {Object} e The onclick event.
 * @private
 */
rpf.ConsoleManager.prototype.selectViewCodeMode_ = function(e) {
  rpf.ConsoleManager.logEvent_(
      'SelectViewMode',
      'VIEW_MODE: ' + Bite.Constants.ViewModes.CODE);

  if (this.viewMode_ == Bite.Constants.ViewModes.CODE) {
    return;
  }
  var bookData = goog.dom.getDocument().querySelector('#bookData');
  if (bookData) {
    goog.style.showElement(this.editorMngr_.getContainer(), true);
    this.editorMngr_.setCode(this.editorMngr_.getTempCode());
    bookData.innerHTML = '';
  }
  this.viewMode_ = Bite.Constants.ViewModes.CODE;
  this.editorMngr_.setCode(this.editorMngr_.getTempCode());
  this.editorMngr_.setTempCode('');
};


/**
 * Gets the infoMap object.
 * @return {Object} The info map of the script.
 */
rpf.ConsoleManager.prototype.getInfoMap = function() {
  return this.infoMap_;
};


/**
 * Callback function for selecting readable mode.
 * @param {Object} e The onclick event.
 * @private
 */
rpf.ConsoleManager.prototype.selectViewReadableMode_ = function(e) {
  rpf.ConsoleManager.logEvent_(
      'SelectViewMode',
      'VIEW_MODE: ' + Bite.Constants.ViewModes.READABLE);

  if (this.viewMode_ == Bite.Constants.ViewModes.READABLE) {
    return;
  }
  this.viewMode_ = Bite.Constants.ViewModes.READABLE;
  this.editorMngr_.setTempCode(this.editorMngr_.getCode());
  this.editorMngr_.setReadableCode();
};


/**
 * Callback function for selecting book mode.
 * @param {Object} e The onclick event.
 * @private
 */
rpf.ConsoleManager.prototype.selectViewBookMode_ = function(e) {
  rpf.ConsoleManager.logEvent_(
      'SelectViewMode',
      'VIEW_MODE: ' + Bite.Constants.ViewModes.BOOK);

  if (this.viewMode_ == Bite.Constants.ViewModes.BOOK ||
      this.viewMode_ == Bite.Constants.ViewModes.READABLE) {
    return;
  }
  this.editorMngr_.setTempCode(this.editorMngr_.getCode());
  this.viewMode_ = Bite.Constants.ViewModes.BOOK;
  goog.style.showElement(this.editorMngr_.getContainer(), false);
  var consoleBookData = goog.dom.getDocument().querySelector('#bookData');
  var steps = bite.console.Helper.getStepsInfo(
      this.getScreenshotDialog().getScreenshotManager(),
      this.infoMap_,
      this.editorMngr_.getCode());
  soy.renderElement(
      consoleBookData,
      bite.client.Templates.rpfConsole.showReadable,
      {'stepsInfo': steps});
  bite.console.Helper.registerScreenChangeEvents(
      steps, goog.bind(this.onScreenChange_, this));
  bite.console.Helper.changeScreen(steps[0]['id'], 'stepScreen');
};


/**
 * Callback function for selecting updater mode.
 * @param {Object} e The onclick event.
 * @private
 */
rpf.ConsoleManager.prototype.selectUpdaterMode_ = function(e) {
  this.changeMode(Bite.Constants.ConsoleModes.UPDATER);
  this.viewMode_ = Bite.Constants.ViewModes.UPDATER;
  goog.style.showElement(this.editorMngr_.getContainer(), false);
  goog.style.showElement(goog.dom.getElement('slideMoreInfoDiv'), false);
  this.modeSelector_.setVisible(false);
  this.locatorUpdater_ = new bite.locators.Updater(this.messenger_);
  this.locatorUpdater_.render(goog.dom.getElement('bookData'));
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONSOLE_CMDS.ENTER_UPDATER_MODE,
       'params': {}});
};


/**
 * On screenshot change handler.
 * @param {Event} e The event object.
 * @private
 */
rpf.ConsoleManager.prototype.onScreenChange_ = function(e) {
  var id = e.target.id;
  bite.console.Helper.changeScreen(id, 'stepScreen');
};


/**
 * Displays the mode text on console UI.
 * @param {Bite.Constants.ConsoleModes} mode The rpf mode.
 * @export
 */
rpf.ConsoleManager.prototype.changeMode = function(mode) {
  if (this.noConsole_) {
    return;
  }
  this.mode_ = mode;
  goog.global.document.title = 'RPF - ' + mode;
  for (var i in rpf.ConsoleManager.Buttons) {
    this.btns_[rpf.ConsoleManager.Buttons[i]].setVisible(false);
  }
  for (var i = 0;
       i < this.modeInfo_.modeAndBtns[this.mode_]['btns'].length;
       i++) {
    this.btns_[this.modeInfo_.modeAndBtns[this.mode_]['btns'][i]].
        setVisible(true);
  }
};


/**
 * Close the current RPF console.
 * @private
 */
rpf.ConsoleManager.prototype.onConsoleClose_ = function() {
  rpf.ConsoleManager.logEvent_('Close', '');
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONTROL_CMDS.REMOVE_WINDOW});
};


/**
 * Refresh the current RPF console.
 * @private
 */
rpf.ConsoleManager.prototype.onConsoleRefresh_ = function() {
  rpf.ConsoleManager.logEvent_('Refresh', '');
  this.messenger_.sendMessage(
      {'command': Bite.Constants.CONTROL_CMDS.CREATE_WINDOW,
       'params': {'refresh': true}});
};


/**
 * Show more info in the console.
 * @private
 */
rpf.ConsoleManager.prototype.onShowMoreInfo_ = function() {
  this.toggleZippy_();
};

