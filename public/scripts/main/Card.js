//@ts-check
import { PopUpCard } from "./PopUpCard.js";

export class Card {
    cardInterface = null;
    layoutFileURL = null;
    openPopUpCards = [];
    moduleId = null;

    view = null;

    constructor(layoutFileURL, moduleId) {
        this.moduleId = moduleId;
        this.layoutFileURL = layoutFileURL;
        //Initialize/cache view elements
        this.view = document.createElement("div");
        //NOTE: A cardView's styling will be handled by the WorkspaceScreen
        //Create the iFrame to load the module
        const iFrame = document.createElement("iframe");
        iFrame.src = layoutFileURL;
        //Add onload to iFrame for connecting cardObject with cardInterface
        iFrame.addEventListener("load", () => {
            this.cardInterface = iFrame.contentWindow.cardInterface;
            this.cardInterface.cardObject = this;
        });
        //Set the cardView's id to match its iFrame's src
        this.view.id = layoutFileURL.slice(layoutFileURL.lastIndexOf("/") + 1, -5).toLowerCase();
        //Append elements into HTML
        this.view.appendChild(iFrame);
    }

    getView() {
        return this.view;
    }

    getTitle() {
        return this.cardInterface.title;
    }

    getInterface() {
        return this.cardInterface;
    }

    getLayoutFilePath() {
        return this.layoutFileURL;
    }

    getModuleId() {
        return this.moduleId;
    }

    getControls(controlsType) {
        switch (controlsType) {
            case "create": return this.cardInterface.createControls; break;
            case "retrieve": return this.cardInterface.retrieveControls; break;
            case "update": return this.cardInterface.updateControls; break;
            case "delete": return this.cardInterface.deleteControls; break;
        }
    }

    getOpenPopUpCards() {
        return this.openPopUpCards;
    }

    isPopUpCardExists(popUpCardLayoutFilePath) {
        let foundPopUpCard = false;
        for (const openPopUpCard of this.openPopUpCards) {
            if (openPopUpCard.getLayoutFilePath() === popUpCardLayoutFilePath) {
                foundPopUpCard = openPopUpCard;
                break;
            }
        }
        return foundPopUpCard;
    }

    createPopUpCard(popUpCardLayoutFilePath) {
        const popUpCard = new PopUpCard(popUpCardLayoutFilePath, this.cardInterface);
        this.openPopUpCards.push(popUpCard);
        return popUpCard;
    }
}