import { FormUtil } from "../../scripts/Utility.mjs";

export class Form {
    bindingObject = {
        username: {
            inputQuery: "#username",
            inputClass: "textInput",
            pattern: "^[0-9a-zA-Z]{3,15}$",
            value: null
        },
        roleId: {
            inputQuery: "#roleId",
            inputClass: "dropDownInput",
            pattern: "^[1-9]{1,}",
            value: null
        }
    };

    view = null;

    constructor(formView) {
        this.view = formView;

        //Add onkeyup to each textInput for syncing its value with dataset.value and for validate itself in realtime
        const textInputs = this.view.querySelectorAll(".inputContainer>input[type='text']");
        for (const textInput of textInputs) {
            textInput.addEventListener("keyup", () => {
                textInput.dataset.value = textInput.value;
                FormUtil.visualizeValidation(this.view, this.bindingObject[textInput.id], true);
            });
        }
        //Add onclick to each dropDownInput for validate itself in realtime
        const dropDownInputs = this.view.querySelectorAll(".inputContainer .dropDownInput");
        for (const dropDownInput of dropDownInputs) {
            dropDownInput.addEventListener("click", () => {
                FormUtil.visualizeValidation(this.view, this.bindingObject[dropDownInput.id], true);
            });
        }
    }

    getView() {
        return this.view;
    }

    getBindingObject() {
        return this.bindingObject;
    }

    //NOTE: Use this before submitting a "create" form
    updateBindingObject(formObject = this.bindingObject) {
        for (const key of Object.keys(formObject)) {
            if (formObject[key].hasOwnProperty("childFormObject") && formObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.updateBindingObject(formObject[key].value);
            } else {
                //Case: Key holds a formField object
                if (formObject[key].inputQuery !== null) {
                    //Case: Field of the formObject have a binding input
                    //Load the value of the input to the binding field
                    formObject[key].value = this.view.querySelector(formObject[key].inputQuery).dataset.value;
                }
            }
        }
    }

    //NOTE: Use this immediately after constructing an "update" form
    updateInputs(formObject = this.bindingObject) {
        for (const key of Object.keys(formObject)) {
            if (formObject[key].hasOwnProperty("childFormObject") && formObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.updateInputs(formObject[key].value);
            } else {
                //Case: Key holds a formField object
                if (formObject[key].inputQuery !== null) {
                    //Case: Field of the formObject have a binding input
                    FormUtil.syncInputWithValue(this.view, formObject[key], null);
                }
            }
        }
    }

    //NOTE: Use this before submitting any form
    validateBindingObject(formObject = this.bindingObject) {
        let hasInvalidValues = false;
        for (const key of Object.keys(formObject)) {
            if (formObject[key].hasOwnProperty("childFormObject") && formObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.validateBindingObject(formObject[key].value);
            } else {
                //Case: Key holds a formField object
                if (formObject[key].regex !== null) {
                    //Case: formField object have a pattern to match
                    const regexp = new RegExp(formObject[key].pattern);
                    if (!regexp.test(formObject[key].value) || formObject[key].value === "null") {
                        //Case: Invalid value found
                        hasInvalidValues = true;
                    }
                    if (formObject[key].inputQuery !== null) {
                        //Case: formField object have a pattern along with an input
                        FormUtil.visualizeValidation(this.view, formObject[key], false);
                    }
                }
            }
            if (hasInvalidValues) {
                window.parent.shellInterface.throwAlert("Oops! Invalid values", "Please correct the invalid values", "Your form includes one or more fields with invalid values. Correcting them is compulsory before submitting the form", null, "OK", null);
            }
        }
    }

    submit() {
        this.updateBindingObject();
        this.validateBindingObject();
    }
}