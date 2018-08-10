import { Buffer } from 'buffer';
import ipfsApi = require('ipfs-api');

import { ActionTypes } from '../constants/ActionTypes';
import { MovementActions, PurchaseStage } from '../constants/Enums';
import { ContractInfo, ImageFileInfo, Point, Rect } from '../models';
import { PlotInfo } from '../models/PlotInfo';

import { purchasePlot as purchasePlotFromChain } from './DataActions';
import { Action } from './EthPlotAction';

export function togglePurchaseFlow(): Action {
  return {
    type: ActionTypes.TOGGLE_PURCHASE_FLOW
  };
}

export function purchaseImageSelected(imageFileInfo: ImageFileInfo, plots: Array<PlotInfo>, scale: number, centerPoint: Point): Action {
  return {
    type: ActionTypes.PURCHASE_IMAGE_SELECTED,
    imageFileInfo,
    plots,
    scale,
    centerPoint
  };
}

export function transformRectToPurchase(delta, plots): Action {
  return {
    type: ActionTypes.TRANSFORM_RECT_TO_PURCHASE,
    delta,
    plots
  };
}

export function startTransformRectToPurchase(startLocation: Point, transformAction: MovementActions): Action {
  return {
    type: ActionTypes.START_TRANSFORM_RECT,
    startLocation,
    transformAction
  };
}

export function stopTransformRectToPurchase(): Action {
  return {
    type: ActionTypes.STOP_TRANSFORM_RECT
  };
}

export function completePurchaseStep(index: number, wasSkipped: boolean): Action {
  return {
    type: ActionTypes.COMPLETE_PURCHASE_STEP,
    index,
    wasSkipped
  };
}

export function goToPurchaseStep(index: number): Action {
  return {
    type: ActionTypes.GO_TO_PURCHASE_STEP,
    index
  };
}

export function changePlotWebsite(website: string, websiteValidation): Action {
  return {
    type: ActionTypes.CHANGE_PLOT_WEBSITE,
    website,
    websiteValidation
  };
}

export function changePlotBuyout(buyoutPricePerPixelInWei: string): Action {
  return {
    type: ActionTypes.CHANGE_PLOT_BUYOUT,
    buyoutPricePerPixelInWei
  };
}

export function changeBuyoutEnabled(isEnabled): Action {
  return {
    isEnabled,
    type: ActionTypes.CHANGE_BUYOUT_ENABLED
  };
}

// Thunk action for purchasing a plot. This requires uploading the image, submitting it to the chain, and waiting for transformations
export function completePlotPurchase(
  contractInfo: ContractInfo, plots: Array<PlotInfo>, rectToPurchase: Rect, purchasePriceInWei: string,
  imageData: string, website: string | undefined, initialBuyoutPerPixelInWei: string | undefined, activeAccount: string) {
  return async (dispatch) => {
    dispatch(startPurchasePlot());

    const ipfsHash = await dispatch(uploadImageData(imageData));
    return dispatch(purchasePlotFromChain(
      contractInfo, plots, rectToPurchase, purchasePriceInWei, website, ipfsHash, initialBuyoutPerPixelInWei!, changePurchaseStep, activeAccount));
  };
}

export function closePlotPurchase(): Action {
  return {
    type: ActionTypes.CLOSE_PLOT_PURCHASE
  };
}

function startPurchasePlot(): Action {
  return {
    type: ActionTypes.START_PURCHASING_PLOT
  };
}

function uploadImageData(imageData: string) {
  return async (dispatch) => {
    dispatch(changePurchaseStep(PurchaseStage.UPLOADING_TO_IPFS));

    const convertedImage = await fetch(imageData);

    const contentType = convertedImage.headers.get('content-type')!;
    let extension = contentType.split('/')[1];
    if (extension.indexOf('svg') >= 0) {
      extension = 'svg';
    }

    const folder = 'images';

    const arrayBuffer = await convertedImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ipfs = ipfsApi('ipfs.infura.io', '5001', { protocol: 'https' });
    const fileName = `img.${extension}`;
    const uploadResult = await ipfs.files.add({ content: buffer, path: `${folder}/${fileName}` });

    const ipfsHash = `${uploadResult[1].hash}/${fileName}`;
    return ipfsHash;
  };
}

export function toggleShowHeatmap(show: boolean): Action {
  return {
    type: ActionTypes.TOGGLE_SHOW_HEATMAP,
    show
  };
}

export function toggleShowGrid(show: boolean): Action {
  return {
    type: ActionTypes.TOGGLE_SHOW_GRID,
    show
  };
}

export function changePurchaseStep(purchaseStage) {
  return {
    type: ActionTypes.CHANGE_PURCHASE_STAGE,
    purchaseStage
  };
}

export function showSnackbarMessage(message: string): Action {
  return {
    type: ActionTypes.SHOW_SNACKBAR_MESSAGE,
    message
  };
}
