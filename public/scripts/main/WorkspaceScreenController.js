//@ts-check
import { ScreenController } from "./ScreenController.js";
import { LogInScreenController } from "./LogInScreenController.js";
import { ShellComponent, PlatformUtil } from "./Utility.js";

export class WorkspaceScreenController extends ScreenController {
    //NOTE: Following declarations are aligned with the z-indexes of the cards where last of the pastCards have the highest z-index
    //NOTE: In the beginning there are no pastCards
    //NOTE: In the beginning last 3 cards are considered presentCards
    //NOTE: In the beginning all other cards are considered upcomingCards
    //NOTE: popUpCards[last] have the highest z-index
    upcomingCards = [];
    presentCards = [];
    pastCards = [];
    permittedModuleOperations = {};

    headerArea = null;
    navigationControl = null;
    timeDisplay = null;
    viewportArea = null;
    quickAccessArea = null;
    actionOverlayView = null;

    constructor(workspaceScreenView) {
        super(workspaceScreenView);
        //Initialize/cache elements
        this.headerArea = this.view.querySelector("#headerArea");
        this.navigationControl = this.headerArea.querySelector("#navigationControl")
        this.timeDisplay = this.headerArea.querySelector("#timeDisplay");
        this.viewportArea = this.view.querySelector("#viewportArea");
        this.quickAccessArea = this.view.querySelector("#quickAccessArea");
        this.actionOverlayView = document.getElementById("actionOverlay");
        this.actionOverlayBackground = this.actionOverlayView.querySelector(".overlayBackground");
        //Fetch username, roleName and profileImage and apply user preferences
        fetch("/users/@me")
            .then(response => response.json())
            .then(response => {
                if (response.status) {
                    //Update sessionData displays
                    this.headerArea.querySelector("#usernameDisplay").innerText = response.data.userPreference.preferredName;
                    this.headerArea.querySelector("#roleNameDisplay").innerText = response.data.role.name;
                    this.headerArea.querySelector("#workspaceAvatar").style.backgroundImage = `url(${URL.createObjectURL(new Blob([new Uint8Array(response.data.userPreference.avatar.data)]))})`;
                    //Apply user preferences to the UI
                    window.shellInterface.setStyle(response.data.userPreference.theme.styleFilePath);
                } else {
                    window.shellInterface.throwAlert(response.error.title, response.error.titleDescription, response.error.message, null, "OK", null);
                }
            })
            .catch(error => {
                window.shellInterface.throwAlert("Aw! snap", "Contact your system administrator", "We couldn't fetch your session data from the internal server. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, null, "OK", null);
            });
        //Fetch all permittedModules
        fetch("/users/@me/modules")
            .then(response => response.json())
            .then(response => {
                if (response.status) {
                    //Create actionOverlayChips for each permitted module
                    const categories = {};
                    const actionOverlayChipPaneTemplate = this.view.querySelector("#templateContainer").content.querySelector(".actionOverlayChipPane");

                    for (let i = 0; i < response.data.length; i++) {
                        if (!categories.hasOwnProperty(response.data[i].moduleCategory.id)) {
                            categories[response.data[i].moduleCategory.id] = actionOverlayChipPaneTemplate.cloneNode(true);
                            categories[response.data[i].moduleCategory.id].firstElementChild.children[0].textContent = response.data[i].moduleCategory.name;
                            categories[response.data[i].moduleCategory.id].firstElementChild.children[1].textContent = response.data[i].moduleCategory.description;
                        }

                        categories[response.data[i].moduleCategory.id].appendChild(ShellComponent.createActionOverlayChip(response.data[i], this));
                    }

                    for (const category of Object.keys(categories)) {
                        this.actionOverlayView.firstElementChild.appendChild(categories[category]);
                    }

                    this.updateActionOverlay();

                    //Present Action Overlay
                    this.actionOverlayView.classList.replace("popOut", "popIn");
                    this.actionOverlayBackground.classList.replace("popOut", "popIn");
                } else {
                    window.shellInterface.throwAlert(response.error.title, response.error.titleDescription, response.error.message, null, "LOGOUT", null).then(() => this.logoutSession());
                }
            })
            .catch(error => {
                window.shellInterface.throwAlert("Aw! snap", "Contact your system administrator", "We couldn't fetch your permitted modules list from the internal server. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, null, "OK", null);
            });

        //Add a timer for updating time in the headerArea
        this.timeDisplay.innerText = PlatformUtil.getCurrentTime();
        setInterval(() => {
            this.timeDisplay.innerText = PlatformUtil.getCurrentTime();
        }, 60000);

        //Add onkeypress to body for scrolling cards
        // document.body.addEventListener("keypress", (event) => {
        //     if (event.keyCode === 50) {
        //         this.scrollViewport(100);
        //     } else if (event.keyCode === 56) {
        //         this.scrollViewport(-100);
        //     }
        // });
        //Add onwheel and onpointerdown to workspaceScreen for scrolling cards
        this.view.addEventListener("wheel", (event) => {
            this.scrollViewport(event.deltaY);
        });
        this.viewportArea.addEventListener("pointerdown", (event) => {
            //Prevent browser's default event handlers from executing
            event.preventDefault();
            //Get a reference of "this" for inner event handlers
            const workspaceScreenController = this;
            //Turn off pointer events for all iFrames
            const iFrames = window.shellInterface.getAllFrames();
            for (let i = 0; i < iFrames.length; i++) {
                iFrames[i].style.pointerEvents = "none";
            }
            //Add eventListeners
            window.addEventListener("pointermove", doScrollViewPort);
            window.addEventListener("pointerup", endScrollViewport);
            //Declare and initialize variables
            let previousTouchPositionY = event.screenY;

            //INNER EVENT HANDLER FUNCTIONS
            function doScrollViewPort(event) {
                //Calculate the travelled distance of the finger as a vector
                const differenceY = previousTouchPositionY - event.screenY;
                if (differenceY < -100) {
                    workspaceScreenController.scrollViewport(125);
                    previousTouchPositionY = event.screenY;
                } else if (differenceY > 100) {
                    workspaceScreenController.scrollViewport(-125);
                    previousTouchPositionY = event.screenY;
                }
            }

            function endScrollViewport() {
                //Turn back on all pointer events for all iFrames
                for (let i = 0; i < iFrames.length; i++) {
                    iFrames[i].removeAttribute("style");
                }
                //Remove all previously added eventListeners
                window.removeEventListener("pointermove", doScrollViewPort);
                window.removeEventListener("pointerup", endScrollViewport);
            }
        });

        //Add onpointerdown to navigationControl for start navigation
        this.navigationControl.addEventListener("pointerdown", (event) => {
            //Get a reference of "this" for inner event handlers
            const workspaceScreenController = this;
            //Turn off pointer events for all iFrames
            const iFrames = window.shellInterface.getAllFrames();
            for (let i = 0; i < iFrames.length; i++) {
                iFrames[i].style.pointerEvents = "none";
            }
            const navigatorControlOptionDisplay = this.view.querySelector("#navigatorControlOptionDisplay");
            //Cache the inner text of navigatorControlOptionDisplay
            const navigatorControlOptionDisplayInnerText = navigatorControlOptionDisplay.innerText;
            //Get the initial pointer position
            const originalMousePositionX = event.screenX || event.touches[0].screenX;
            const originalMousePositionY = event.screenY || event.touches[0].screenY;

            this.view.addEventListener("pointermove", determineOption);
            this.view.addEventListener("pointerup", executeOption);

            let differenceX = 0;
            let differenceY = 0;
            let procedureToExecute = () => { };

            //INNER EVENT HANDLER FUNCTIONS
            function determineOption(event) {
                //Calculate the travelledDistance of the mouse as a vector
                differenceX = (event.screenX || event.touches[0].screenX) - originalMousePositionX;
                differenceY = (event.screenY || event.touches[0].screenY) - originalMousePositionY;

                const absoluteDifferenceX = Math.abs(differenceX);
                const absoluteDifferenceY = Math.abs(differenceY);
                if (absoluteDifferenceX >= absoluteDifferenceY) {
                    //CASE: x axis must be prioritized
                    if (differenceX > 0) {
                        //Logout session
                        workspaceScreenController.navigationControl.style.borderColor = "transparent var(--headerAreaColor) transparent transparent";
                        navigatorControlOptionDisplay.innerText = "Logout";
                        procedureToExecute = () => {
                            window.shellInterface.throwAlert("You're about to logout", "Confirm your action", "You are about to logout from the system. Make sure if all of your work is saved as all of the unsaved work will be lost. After a successful logout you can login as another user or as the current one", null, "PROCEED", "CANCEL").then(() => {
                                workspaceScreenController.logoutSession();
                            }).catch(() => {
                                //NOTE: No need to do anything here
                            });
                        };
                    } else if (differenceX < 0) {
                        //Show actionOverlay
                        workspaceScreenController.navigationControl.style.borderColor = "transparent transparent transparent var(--headerAreaColor)";
                        navigatorControlOptionDisplay.innerText = "View action overlay";
                        procedureToExecute = () => {
                            workspaceScreenController.updateActionOverlay();
                            workspaceScreenController.actionOverlayView.classList.replace("popOut", "popIn");
                            workspaceScreenController.actionOverlayBackground.classList.replace("popOut", "popIn");
                        }
                    }
                } else {
                    //CASE: y axis must be prioritized
                    if (differenceY > 0) {
                        //Remove presentCard[2]
                        workspaceScreenController.navigationControl.style.borderColor = "transparent transparent var(--headerAreaColor) transparent";
                        navigatorControlOptionDisplay.innerText = "Close current card";
                        procedureToExecute = workspaceScreenController.removeCurrentCard.bind(workspaceScreenController);
                    } else if (differenceY < 0) {
                        //WARNING: Not implemented
                        workspaceScreenController.navigationControl.style.borderColor = "var(--headerAreaColor) transparent transparent transparent";
                        navigatorControlOptionDisplay.innerText = "Settings and preferences";
                        procedureToExecute = () => {

                        }
                    }
                }
            }

            function executeOption() {
                //Execute determined procedure
                procedureToExecute();
                //Remove styling
                workspaceScreenController.navigationControl.removeAttribute("style");
                //Turn back on all pointer events for all iFrames
                for (let i = 0; i < iFrames.length; i++) {
                    iFrames[i].removeAttribute("style");
                }
                //Restore navigatorControlOptionDisplay's inner text
                navigatorControlOptionDisplay.innerText = navigatorControlOptionDisplayInnerText;
                //Remove all previously added eventListeners
                workspaceScreenController.view.removeEventListener("pointermove", determineOption);
                workspaceScreenController.view.removeEventListener("pointerup", executeOption);
            }
        });

        //Add onclick to the close button in actionOverlay for closing actionOverlay
        this.actionOverlayView.lastElementChild.addEventListener("click", () => {
            this.actionOverlayBackground.classList.replace("popIn", "popOut");
            setTimeout(() => {
                this.actionOverlayView.classList.replace("popIn", "popOut");
            }, 250);
        });
    }

    addCard(card) {
        //Set cardView's style
        //NOTE: A user created card will always be treated as the pastCards[0]
        card.getView().setAttribute("class", "card pastCard");
        //Add onload to cardView's iFrame for scrolling viewport after creation
        card.getView().querySelector("iframe").addEventListener("load", () => {
            //NOTE: The viewport must be scrolled backwards
            this.scrollViewport(-125);
        });
        //Append elements into HTML
        //NOTE: A card's appearance in the HTML DOM corresponds its z-index
        if (this.pastCards.length > 0) {
            this.viewportArea.insertBefore(card.getView(), this.pastCards[0].getView());
        } else {
            this.viewportArea.appendChild(card.getView());
        }
        //Add the card to relevant array
        this.pastCards.unshift(card);
    }

    removeCurrentCard() {
        if (this.presentCards.length > 0) {
            //CASE: There is at least one card open
            //Animate out the currentCard from view
            const currentCard = this.presentCards[this.presentCards.length - 1];
            //Remove all popUpCards of currentCard
            //NOTE: Closing one popUpCard will alter the openPopUpCards[]. Therefore we must copy that array to a temporary array
            const tempOpenPopUpCards = [];
            for (let i = 0; i < currentCard.getOpenPopUpCards().length; i++) {
                tempOpenPopUpCards[i] = currentCard.getOpenPopUpCards()[i];
            }
            for (const openPopUpCard of tempOpenPopUpCards) {
                openPopUpCard.close();
            }
            const currentCardView = currentCard.getView();
            currentCardView.style.animation = "removePresentCard 0.5s forwards";

            //Remove all memory allocations of currentCard
            if ((this.pastCards.length + this.presentCards.length) > 1) {
                //CASE: There are more than one card open
                setTimeout(() => {
                    if (this.presentCards.length > 1) {
                        //CASE: Positive scrolling is possible
                        this.scrollViewport(100);
                        this.pastCards.shift();
                        currentCardView.remove();
                    } else {
                        //CASE: Positive scrolling is not possible
                        currentCardView.style.animation = "removePresentCard 0.5s forwards";
                        this.scrollViewport(-100);
                        this.presentCards.shift();
                        currentCardView.remove();
                    }
                }, 450);
            } else {
                //CASE: There is only one card open
                this.presentCards.pop();

                //Update status area
                this.headerArea.querySelector("#moduleNameDisplay").innerText = "";
                
                //Animate out quickAccessArea
                this.quickAccessArea.parentElement.classList.add("popOut");
                //UpdateQuickAccessArea and animate in quickAccessArea
                setTimeout(() => {
                    this.quickAccessArea.innerHTML = "";
                    this.quickAccessArea.parentElement.classList.remove("popOut");
                    currentCardView.remove();

                    //Present Action Overlay
                    this.actionOverlayView.classList.replace("popOut", "popIn");
                    this.actionOverlayBackground.classList.replace("popOut", "popIn");
                }, 300);
            }
        } else {
            //CASE: There are no cards open
            window.shellInterface.throwAlert("No cards to close!", "Try Action Overlay to open a card", "You have no cards open currently. You can open the Action Overlay to open a card", null, "OK", null);
        }
    }

    updateCardStyles() {
        //Set style for upcomingCards
        //NOTE: Only the upcomingCards[lastIndex] needs to be modified (if it exists)
        if (this.upcomingCards.length > 0) {
            this.upcomingCards[this.upcomingCards.length - 1].getView().setAttribute("class", `card upcomingCard`);
        }
        //Set style for presentCards
        for (let i = this.presentCards.length - 1, j = 2; i >= 0; i--) {
            this.presentCards[i].getView().setAttribute("class", `card presentCard presentCard${j}`);
            j--;
        }
        //Set style for pastCards
        //NOTE: Only the pastCards[0] needs to be modified (if it exists)
        if (this.pastCards.length > 0) {
            this.pastCards[0].getView().setAttribute("class", `card pastCard`);
        }
    }

    addPopUpCard(popUpCard) {
        //NOTE: PopUpCards are not a part of viewportArea
        this.view.appendChild(popUpCard.getView());
        //Set popUpCardView's z-index to be the highest among popUpCards
        //NOTE: The relevant z-index matches openPopUpCards array's length
        popUpCard.getView().style.zIndex = document.querySelectorAll(".popUpCard").length;
    }

    focusPopUpCard(popUpCard) {
        //Get all popUpCards
        const openPopUpCardViews = Array.from(document.querySelectorAll(".popUpCard"));
        //Move popUpCard's view to the last position of the openPopUpCards
        openPopUpCardViews.push(openPopUpCardViews.splice(openPopUpCardViews.indexOf(popUpCard.getView()), 1)[0]);
        //Update z-indices of openPopUpCards according to the arrayIndex
        for (let i = 0; i < openPopUpCardViews.length; i++) {
            openPopUpCardViews[i].style.zIndex = i;
        }
    }

    updateQuickAccessArea() {
        //Clear innerHTML of the quickAccessArea
        this.quickAccessArea.innerHTML = "";
        //Get the presentCard2
        const presentCard2 = this.presentCards[this.presentCards.length - 1];
        const moduleId = presentCard2.getModuleId();
        //Update moduleName display according to the presentCard2
        this.headerArea.querySelector("#moduleNameDisplay").innerText = presentCard2.getTitle();
        //Check if the permittedModuleOperations are cached
        if (this.permittedModuleOperations.hasOwnProperty(moduleId)) {
            addQuickAccessControls.bind(this)();
        } else {
            //Fetch permittedModuleOperations and cache them
            fetch(`/users/@me/modules/${moduleId}`)
                .then(response => response.json())
                .then(response => {
                    if (response.status) {
                        this.permittedModuleOperations[moduleId] = response.data.value;
                        addQuickAccessControls.bind(this)();
                    } else {
                        window.shellInterface.throwAlert(response.error.title, response.error.titleDescription, response.error.message, null, "OK", null);
                    }
                })
                .catch(error => {
                    window.shellInterface.throwAlert("Aw! snap", "Contact your system administrator", "We couldn't fetch your permitted operations for the current module from the internal server. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, null, "OK", null);
                });
        }

        function addQuickAccessControls() {
            //Add createControls to the quickAccessArea if the user has "create" permissions
            if (this.permittedModuleOperations[moduleId][0] === "1") {
                this.quickAccessArea.append(...presentCard2.getControls("create"),);
            }
            //Add retrieveControls to the quickAccessArea if the user has "retrieve" permissions
            if (this.permittedModuleOperations[moduleId][1] === "1") {
                this.quickAccessArea.append(...presentCard2.getControls("retrieve"));
            }
            //Add updateControls to the quickAccessArea if the user has "update" permissions
            if (this.permittedModuleOperations[moduleId][2] === "1") {
                this.quickAccessArea.append(...presentCard2.getControls("update"));
            }
            //Add deleteControls to the quickAccessArea if the user has "delete" permissions
            if (this.permittedModuleOperations[moduleId][3] === "1") {
                this.quickAccessArea.append(...presentCard2.getControls("delete"));
            }
        }
    }

    scrollViewport(delta) {
        //Get the current lengths of upcomingCards and pastCards
        const upcomingCardsLength = this.upcomingCards.length;
        const pastCardsLength = this.pastCards.length;
        //NOTE: When delta < 0, cards are scrolled backwards (ie. pastCards are scrolled towards presentCards)
        if (delta < 0) {
            if (this.pastCards.length > 0) {
                this.presentCards.push(this.pastCards.shift());
            }
            if (this.presentCards.length > 3) {
                this.upcomingCards.push(this.presentCards.shift());
            }
        } else if (delta > 0) {
            if (this.presentCards.length > 1) {
                this.pastCards.unshift(this.presentCards.pop());
            }
            if (this.upcomingCards.length > 0) {
                this.presentCards.unshift(this.upcomingCards.pop());
            }
        }
        //NOTE: updateCardStyles() and updateQuickAccessArea() should be executed only if there is a change in either of the lengths of upcomingCards or pastCards
        if ((this.upcomingCards.length !== upcomingCardsLength) || (this.pastCards.length !== pastCardsLength)) {
            this.updateCardStyles();
            //Animate out quickAccessArea
            this.quickAccessArea.parentElement.classList.add("popOut");
            //UpdateQuickAccessArea and animate in quickAccessArea
            setTimeout(() => {
                this.updateQuickAccessArea();
                this.quickAccessArea.parentElement.classList.remove("popOut");
            }, 300);
        }
    }

    isCardExist(cardLayoutFilePath) {
        //NOTE: When scroll < 0, cards are scrolled backwards (ie. pastCards are scrolled towards presentCards)
        let scroll = null;
        for (let i = 0; i < this.pastCards.length; i++) {
            if (this.pastCards[i].getLayoutFilePath() === cardLayoutFilePath) {
                scroll = -(i+1);
                break;
            }
        }
        for (let i = 0; i < this.presentCards.length; i++) {
            if (this.presentCards[i].getLayoutFilePath() === cardLayoutFilePath) {
                scroll = this.presentCards.length -1 -i;
                break;
            }
        }
        for (let i = 0; i < this.upcomingCards.length; i++) {
            if (this.upcomingCards[i].getLayoutFilePath() === cardLayoutFilePath) {
                scroll = this.upcomingCards.length - i + this.presentCards.length -1;
                break;
            }
        }
        return scroll;
    }

    updateActionOverlay() {
        const actionOverlayChips = this.actionOverlayView.querySelectorAll(".actionOverlayChip");

        for (const actionOverlayChip of actionOverlayChips) {
            if (actionOverlayChip.dataset.glanceRequestUrl) {
                fetch(actionOverlayChip.dataset.glanceRequestUrl)
                .then((response) => response.json())
                .then(response => {
                    if (response.status) {
                        //Find the status field name by looping through keys of the first element
                        //NOTE: status field name changes as orderStatus, employeeStatus etc.
                        for (const key of Object.keys(response.data[0])) {
                            if (key.endsWith("Status")) {
                                actionOverlayChip.children[1].textContent = `${response.data.length} ${response.data[0][key].name.toLowerCase()}`;
                                break;
                            }
                        }
                    }
                })
            }
        }
    }

    logoutSession() {
        fetch("/sessions/@me", {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(response => {
                if (response.status) {
                    //Transit screen
                    window.shellInterface.transitScreen(new LogInScreenController(document.getElementById("logInScreen")));
                    //Remove actionOverlayChips
                    this.actionOverlayView.firstElementChild.innerHTML = "";
                }
            })
            .catch(error => {
                window.shellInterface.throwAlert("Aw! snap", "Contact your system administrator", "We couldn't logout you from your session. The most likely cause may be a network failure. If it is not the case, provide your system administrator with the following error\n\n" + error, null, "OK", null);
            });
    }
}