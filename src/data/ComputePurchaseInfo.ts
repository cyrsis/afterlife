import { BigNumber } from 'bignumber.js';

import { PlotInfo, Rect } from '../models';

import * as PlotMath from './PlotMath';

export interface PurchaseInfo {
  purchaseData?: {
    chunksToPurchase: Array<Rect>;
    chunksToPurchaseAreaIndices: Array<number>;
    purchasePrice: string;
    plotPrice: string;
    feePrice: string;
  };
  isValid: boolean;
  errorMessage?: string;
}

// Computes what chunks are needed to be purchased for a particular region
export function computePurchaseInfo(rectToPurchase: Rect, plots: Array<PlotInfo>): PurchaseInfo {
  const purchasedChunks = new Array<Rect>();
  const purchasedChunkAreaIndices = new Array<number>();
  let purchasePrice = new BigNumber(0);

  if (rectToPurchase.w * rectToPurchase.h > 1000) {
    return {
      isValid: false,
      errorMessage: `Plots cannot be greater than 1000 pixels`
    };
  }

  // We'll need to walk the ownership array backwards and see who we need to buy chunks from
  let remainingChunksToPurchase = [rectToPurchase];
  let i = plots.length - 1;
  while (remainingChunksToPurchase.length > 0 && i >= 0) {
    const currentPlot = plots[i];

    for (let j = 0; j < remainingChunksToPurchase.length; j++) {
      const chunkToPurchase = remainingChunksToPurchase[j];
      if (PlotMath.doRectanglesOverlap(currentPlot.rect, chunkToPurchase)) {

        // Look at the overlap between the chunk we're trying to purchase, and the ownership plot we have
        const chunkOverlap = PlotMath.computeRectOverlap(currentPlot.rect, chunkToPurchase);

        const newHole = chunkOverlap;

        // Note: we don't need to subtract any holes here because we're walking the plots array backwards. Any chunks which still need to be
        // purchased must have missed the ownership of the layers above

        // Add the new holes to the purchaseChunks and keep track of their index
        purchasedChunks.push(newHole);
        purchasedChunkAreaIndices.push(i);

        // Add up the price of these chunks we are purchasing
        const plotBuyout = new BigNumber(currentPlot.buyoutPricePerPixelInWei).mul(chunkOverlap.w * chunkOverlap.h);
        if (plotBuyout.equals(0)) {
          return {
            isValid: false,
            errorMessage: `One of the plots is not for sale`
          };
        }
        purchasePrice = purchasePrice.add(plotBuyout);

        // Final step is to delete this chunkToPurchase (since it's accounted for) and add whatever is
        // remaining back to remainingChunksToPurchase
        remainingChunksToPurchase.splice(j, 1);

        const newChunksToPurchase = PlotMath.subtractRectangles(chunkToPurchase, newHole);
        remainingChunksToPurchase = remainingChunksToPurchase.concat(newChunksToPurchase);

        j--; // subtract one from j so we don't miss anything

        // Do a simple assertion that we never have overlapping remainingChunksToPurchase
        if (PlotMath.doAnyOverlap(remainingChunksToPurchase)) {
          return {
            isValid: false,
            errorMessage: `Invalid state detected`
          };
        }
      }

    }
    
    i--;
  }

  if (remainingChunksToPurchase.length > 0) {
    return {
      isValid: false,
      errorMessage: `Invalid state detected`
    };
  }

  // Finally, compute the fee we are charging the user. Right now this is fixed at 1% and computed by multiplying by 1000, then dividing by 
  const feePrice = purchasePrice.mul(1000).div(1000 * 100);
  const totalPrice = purchasePrice.add(feePrice);

  return {
    purchaseData: {
      chunksToPurchase: purchasedChunks,
      chunksToPurchaseAreaIndices: purchasedChunkAreaIndices,
      purchasePrice: totalPrice.toFixed(0),
      plotPrice: purchasePrice.toFixed(0),
      feePrice: feePrice.toFixed(0)
    },
    isValid: true
  };
}
