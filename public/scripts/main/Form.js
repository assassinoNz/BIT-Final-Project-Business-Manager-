//@ts-check
import { FormUtil } from "./Utility.js";

export class Form {
    bindingObject = null;
    referenceBindingObject = null;
    invalidBindingObject = false;
    submissionMethod = "";
    submissionURL = "";

    view = null;

    constructor(formView) {
        //Initialize/cache view elements
        this.view = formView;
    }

    //WARNING: This method returns a promise that resolves to "this". Use it asynchronously
    //NOTE: It is done because of there are other methods on popUpCardInterfaces that rely on the bindingObject
    init(bindingObjectURL, submissionURL, submissionMethod) {
        this.submissionURL = submissionURL;
        this.submissionMethod = submissionMethod;
        //Load bindingObject
        return fetch(`${location.protocol}//${location.host}${bindingObjectURL}`)
            .then(response => response.json())
            .then(response => {
                if (response.status) {
                    this.bindingObject = response.data;
                    this.referenceBindingObject = response.data;
                    //Add onkeyup to each textInput for validate itself in realtime
                    const textInputs = this.view.querySelectorAll(".inputContainer>input[type='text']");
                    for (const textInput of textInputs) {
                        textInput.addEventListener("keyup", () => {
                            FormUtil.visualizeValidation(this.view, this.bindingObject[textInput.id], true);
                        });
                    }
                    return this;
                } else {
                    return null;
                }
            })
            .catch(error => {
                window.parent.shellInterface.throwAlert("Aw! snap", "Contact your system administrator", "We couldn't fetch required binding object from the internal registry. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, null, "OK", null);
            });
    }

    getView() {
        return this.view;
    }

    getSubmissionMethod() {
        return this.submissionMethod;
    }

    getReferenceBindingObject() {
        return this.referenceBindingObject;
    }

    getBindingObject() {
        return this.bindingObject;
    }

    //NOTE: Use this before updating inputs of an "update" form
    //NOTE: When requesting objects from the server, they are plain objects (objects with only data). But forms work with bindingObjects (objects that have validation and view binding capabilities along with data)
    mapToBindingObject(bindingObject = this.bindingObject, plainObject) {
        //NOTE: Binding object doesn't have an "id" formField. But the plain object has it
        //Add the id formField to bindingObject
        bindingObject.id = {
            inputQuery: null,
            inputClass: null,
            pattern: "^[1-9]{1,}$",
            value: plainObject.id
        }
        for (const key of Object.keys(bindingObject)) {
            if (bindingObject[key].hasOwnProperty("childFormObject") && bindingObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.mapToBindingObject(bindingObject[key].value, plainObject[key]);
            } else {
                //Case: Key holds a formField object
                bindingObject[key].value = plainObject[key];
            }
        }
    }

    //WARNING: Doesn't work when deSyncedObject is an array
    //NOTE: Use this before submitting a "create" form
    updateBindingObject(bindingObject = this.bindingObject) {
        if (Array.isArray(bindingObject)) {
            //Case: deSyncedObject is an array
            //Cannot update elements inside arrays
        } else {
            //Case: deSyncedObject is an object
            for (const key of Object.keys(bindingObject)) {
                if (bindingObject[key].hasOwnProperty("childFormObject") && bindingObject[key].childFormObject === true) {
                    //Case: Key holds an entire new formObject
                    this.updateBindingObject(bindingObject[key].value);
                } else {
                    //Case: Key holds a formField object
                    if (bindingObject[key].inputQuery !== null) {
                        //Case: Field of the formObject have a binding input
                        //Load the value of the input to the binding field
                        bindingObject[key].value = this.view.querySelector(bindingObject[key].inputQuery).value;
                        // console.log("UPDATED", key, "WITH", bindingObject[key].value);
                    }
                }
            }
        }
    }

    //NOTE: Use this immediately after constructing an "update" form
    updateInputs(bindingObject = this.bindingObject) {
        for (const key of Object.keys(bindingObject)) {
            if (bindingObject[key].hasOwnProperty("childFormObject") && bindingObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.updateInputs(bindingObject[key].value);
            } else {
                //Case: Key holds a formField object
                if (bindingObject[key].inputQuery !== null) {
                    //Case: Field of the formObject have a binding input
                    FormUtil.syncInputWithValue(this.view, bindingObject[key], null);
                }
            }
        }
    }

    resetInputs(bindingObject = this.bindingObject) {
        for (const key of Object.keys(bindingObject)) {
            if (bindingObject[key].hasOwnProperty("childFormObject") && bindingObject[key].childFormObject === true) {
                //Case: Key holds an entire new formObject
                this.resetInputs(bindingObject[key].value);
            } else {
                //Case: Key holds a formField object
                if (bindingObject[key].inputClass !== null) {
                    if (bindingObject[key].inputClass === "textInput") {
                        this.view.querySelector(bindingObject[key].inputQuery).value = "";
                    } else if (bindingObject[key].inputClass === "dropDownInput") {
                        this.view.querySelector(bindingObject[key].inputQuery).value = "1";
                    }
                }
            }
        }
    }

    //NOTE: Use this before submitting any form
    validateBindingObject(referenceBindingObject = this.referenceBindingObject, alteredBindingObject = this.bindingObject) {
        //NOTE: Validation is done against the referenceObject as it has the correct structure
        if (Array.isArray(referenceBindingObject)) {
            //Case: referenceObject is an array
            //NOTE: referenceObject only contains one reference element for all the elements inside alteredObject
            const referenceElement = referenceBindingObject[0];
            //Validate each element inside alteredObject against referenceElement
            for (const bindingObjectElement of alteredBindingObject) {
                this.validateBindingObject(referenceElement, bindingObjectElement)
            }
        } else {
            //Case: referenceObject is an object
            for (const key of Object.keys(referenceBindingObject)) {
                if (referenceBindingObject[key].hasOwnProperty("childFormObject") && referenceBindingObject[key].childFormObject === true) {
                    //Case: Key holds an entire new formObject
                    this.validateBindingObject(referenceBindingObject[key].value, alteredBindingObject[key].value);
                } else {
                    //Case: Key holds a formField object
                    if (referenceBindingObject[key].regex !== null) {
                        //Case: formField object must have a pattern to match
                        // console.log("VALIDATED", key, "DATA", alteredBindingObject[key].value);
                        const regexp = new RegExp(referenceBindingObject[key].pattern);
                        if (!regexp.test(alteredBindingObject[key].value) || alteredBindingObject[key].value === "null") {
                            //Case: Invalid value found
                            this.invalidBindingObject = true;
                        }
                        if (referenceBindingObject[key].inputQuery !== null) {
                            //Case: formField object must have a pattern along with an input
                            FormUtil.visualizeValidation(this.view, alteredBindingObject[key], false);
                        }
                    }
                }
            }
        }
    }

    async submit() {
        this.updateBindingObject(this.bindingObject);

        //Reset invalidBindingObject flag
        this.invalidBindingObject = false;
        this.validateBindingObject(this.referenceBindingObject, this.bindingObject);
        
        if (this.invalidBindingObject) {
            return {
                status: false,
                error: {
                    title: "There are invalid values", titleDescription: "Please correct them", message: "Your form includes one or more fields with invalid values. Correcting them is compulsory before submitting the form. Check for red bounding boxes to find inputs with invalid values"
                }
            };
        } else {
            return fetch(`${location.protocol}//${location.host}${this.submissionURL}`, {
                method: this.submissionMethod,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bindingObject: this.bindingObject
                })
            })
            .then(response => response.json())
            .then(response => response)
            .catch(error => {
                return {
                    status: false,
                    error: error
                };
            });
        }
    }
}