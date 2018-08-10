import * as Enums from '../constants/Enums';
import { ContractInfo, ImageFileInfo, PlotInfo, Point, Rect, RectDelta } from '../models';

// Account Actions
export type updateMetamaskState = (newState: Enums.METAMASK_STATE, networkName: Enums.NetworkName) => void;
export type updateActiveAccount = (newActiveAccount: string) => void;
export type addTransaction =
  (uniqueEventHash: string, txHash: string, txType: Enums.TxType, txStatus: Enums.TxStatus, blockNumber: number, isNew: boolean) => void;
export type clearNotificationCount = () => void;
export type loadTransactions = () => void;
export type doneLoadingTransactions = () => void;
export type loadAndWatchEvents = (contractInfo: ContractInfo, currentAddress: string) => void;

// Data Actions
export type addPlot = (newPlot: PlotInfo) => void;
export type plotListed = (txHash: string, zoneIndex: number) => void;
export type updateAuction = (contractInfo: ContractInfo, zoneIndex: number, newPrice: string, activeAccount: string) => void;
export type purchasePlot = 
  (contractInfo: ContractInfo,
   plots: Array<PlotInfo>,
   rectToPurchase: Rect,
   purchasePriceInWei: string,
   url: string,
   ipfsHash: string,
   initialBuyoutPerPixelInWei: string | undefined,
   changePurchaseStep: (stage: Enums.PurchaseStage) => void,
   activeAccount: string) => void;
export type loadBlockInfo = (contractInfo: ContractInfo, blockNumber: number) => void;

// Grid Actions
export type hoverOverPlot = (plotIndex: number) => void;
export type enterBuyMode = () => void;
export type startDraggingRect = (x: number, y: number) => void;
export type stopDraggingRect = () => void;
export type resizeDraggingRect = (x: number, y: number) => void;
export type showPurchaseDialog = (rectToPurchase: Rect) => void;
export type hidePurchaseDialog = () => void;
export type changeZoom = (direction: number) => void;

export type reportGridDragging = (action: Enums.DragType, location: Point) => void;

// Purchase Actions
export type togglePurchaseFlow = () => void;
export type purchaseImageSelected = (imageFileInfo: ImageFileInfo, plots: Array<PlotInfo>, scale: number, centerPoint: Point) => void;
export type transformRectToPurchase = (delta: RectDelta, plots: Array<PlotInfo>) => void;
export type startTransformRectToPurchase = (startLocation: Point, transformAction: Enums.MovementActions) => void;
export type stopTransformRectToPurchase = () => void;
export type completePurchaseStep = (index: number, wasSkipped: boolean) => void;
export type goToPurchaseStep = (index: number) => void;
export type changePlotWebsite = (website: string, websiteValidation) => void;
export type changePlotBuyout = (buyoutPricePerPixelInWei: string) => void;
export type changeBuyoutEnabled = (isEnabled: boolean) => void;
export type completePlotPurchase = 
  (contractInfo: ContractInfo, 
   plots: Array<PlotInfo>,
   rectToPurchase: Rect,
   purchasePriceInWei: string,
   imageData: string,
   website: string | undefined,
   initialBuyoutPerPixelInWei: string | undefined,
   activeAccount: string) => void;
export type closePlotPurchase = () => void;
export type startPurchasePlot = () => void;
export type changePurchaseStep = (purchaseStage: Enums.PurchaseStage) => void;
export type toggleShowHeatmap = (show: boolean) => void;
export type toggleShowGrid = (show: boolean) => void;
export type resetPurchaseFlow = () => void;


export interface AllActions {
  updateMetamaskState: updateMetamaskState;
  updateActiveAccount: updateActiveAccount;
  addTransaction: addTransaction;
  clearNotificationCount: clearNotificationCount;
  loadTransactions: loadTransactions; 
  doneLoadingTransactions: doneLoadingTransactions;
  loadAndWatchEvents: loadAndWatchEvents;
  addPlot: addPlot;
  plotListed: plotListed;
  updateAuction: updateAuction;
  purchasePlot: purchasePlot;
  loadBlockInfo: loadBlockInfo;
  hoverOverPlot: hoverOverPlot;
  enterBuyMode: enterBuyMode;
  startDraggingRect: startDraggingRect;
  stopDraggingRect: stopDraggingRect;
  resizeDraggingRect: resizeDraggingRect;
  showPurchaseDialog: showPurchaseDialog;
  hidePurchaseDialog: hidePurchaseDialog;
  changeZoom: changeZoom;
  reportGridDragging: reportGridDragging;
  togglePurchaseFlow: togglePurchaseFlow;
  purchaseImageSelected: purchaseImageSelected;
  transformRectToPurchase: transformRectToPurchase;
  startTransformRectToPurchase: startTransformRectToPurchase;
  stopTransformRectToPurchase: stopTransformRectToPurchase;
  completePurchaseStep: completePurchaseStep;
  goToPurchaseStep: goToPurchaseStep;
  changePlotWebsite: changePlotWebsite;
  changePlotBuyout: changePlotBuyout;
  changeBuyoutEnabled: changeBuyoutEnabled;
  completePlotPurchase: completePlotPurchase;
  closePlotPurchase: closePlotPurchase;
  startPurchasePlot: startPurchasePlot;
  changePurchaseStep: changePurchaseStep;
  toggleShowHeatmap: toggleShowHeatmap;
  toggleShowGrid: toggleShowGrid;
  resetPurchaseFlow: resetPurchaseFlow;
}
