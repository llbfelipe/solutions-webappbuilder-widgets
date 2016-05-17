define({
  root: ({
    layersPage: {
      title: "Select a template to create features",
      generalSettings: "General Settings",
      layerSettings:"Layer Settings",
      editDescription: "Provide display text for the edit panel",
      editDescriptionTip: "This text is displayed above the Template picker, leave blank for no text.",
      promptOnSave: "Prompt to save unsaved edits when form is close or switched to the next record?",
      promptOnSaveTip: "Display a prompt when the user clicks close or navigates to the next editable record when the current feature has unsaved edits.",
      promptOnDelete: "Require confirmation when deleting a record?",
      promptOnDeleteTip: "Display a prompt when the user clicks delete to confirm the aciton.",
      removeOnSave: "Remove Feature from Selection on Save",
      removeOnSaveTip: "Option to remove the feature from the selection set when the record is saved.  If it is the only selected record, the panel is switched back to the template page.",
      layerSettingsTable: {
        allowDelete: "Allow Delete",
        allowDeleteTip: "Option to allow the user to delete a feature, disabled if the layer does not support delete",
        edit: "Editable",
        editTip: "Option to include the layer in the widget",
        label: "Layer",
        labelTip: "Name of the layer as defined in the map",
        update: "Disable Geometry Editing",
        updateTip: "Option to disable the ability to move the geometry once placed or move the geometry on an existing feature",
        allowUpdateOnly: "Update Only",
        allowUpdateOnlyTip: "Option to allow only the modication of existing feature, checked on my default and disabled if the layer does not support creating new features",
        fields: "Fields",
        fieldsTip: "Modify the fields to be edited and define Smart Attributes",
        description: "Description",
        descriptionTip:"Optionally enter text you want to display on top of the attribute page."
      }
    },
    editDescriptionPage: {
      title: "Define attribute overview text for <b>${layername}</b> "},
    fieldsPage: {
      title: "Configure fields for <b>${layername}</b>",
      description:"Set the fields that will be editable in the Smart Editor.  Use the Preset column to allow the user to enter a value prior to creating a new feature.  These values can be apply to every new feature that contains these fields.  If the same field is present in more than one layer, they are combined in the Preset field list.  The preset fields are only applied to new features.  Use the Action edit button to activate Smart Attributes on a layer.  The Smart Attributes can require, hide or disable a field based on values in other fields.",
      fieldsSettingsTable: {
        edit: "Editable",
        editTip: "Check on if the field is present in the attribute form",
        fieldName: "Name",
        fieldNameTip: "Name of the field defined in the database",
        fieldAlias: "Alias",
        fieldAliasTip: "Name of the field defined in the map",
        canPresetValue: "Preset",
        canPresetValueTip: "Option to show the field in the preset field list, allow the user to set the value prior to editing",
        actions: "Actions",
        actionsTip: "Change the order of the fields or set up Smart Attributes",
      },
      smartAttSupport: "Smart Attributes not supported on required database fields"
    },
    actionPage: {
      title: "Configure the Smart Attribute actions for <b>${fieldname}</b>",
      description:"The actions are always off unless you specify the criteria on which they will be triggered.  The actions are processed in order and only one action will be triggered per field.  Use the Criteria Edit button to define the criteria.",
      actionsSettingsTable: {
        rule: "Action",
        ruleTip: "Action performed when the criteria is satsified",
        expression: "Expression",
        expressionTip: "The resulting expression in SQL format from the defined criteria",
        actions: "Criteria",
        actionsTip: "Change the order of the rule and define the criteria when it is triggered",
      },
    },
    filterPage: {
      title: "Configure clause for the ${action} rule",
      filterBuilder: "Set action on field when record matches ${any_or_all} of the following expressions",
      noFilterTip: "Using the tools below, define the statement for when the action is active.",

    }
  })
});