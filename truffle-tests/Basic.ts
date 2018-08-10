import { BigNumber } from 'bignumber.js';
import { assert } from 'chai';
import { Store } from 'redux';
import * as Web3 from 'web3';

import { promisify } from '../gen-src/typechain-runtime';
import { EthPlot } from '../gen-src/EthPlot';
import * as AccountActions from '../src/actionCreators/AccountActions';
import * as DataActions from '../src/actionCreators/DataActions';
import { changePurchaseStep } from '../src/actionCreators/PurchaseActions';
import { computePurchaseInfo } from '../src/data/ComputePurchaseInfo';
import { Rect } from '../src/models';
import { RootState } from '../src/reducers';
import { configureStore }  from '../src/store/configureStore.prod';

import { generated100 } from './PlotsToPurchase';

// In order to benefit from type-safety, we re-assign the global web3 instance injected by Truffle
// with type `any` to a variable of type `Web3`.
const web3: Web3 = (global as any).web3;

const ethPlotContract = artifacts.require<EthPlot>('./EthPlot.sol');
const STANDARD_GAS = '2000000';

const initializeStoreAndLoadPlots = async (contractAddress: string, web3Provider: string, currentAddress: string): Promise<Store<RootState>> => {
  const store = configureStore();
  store.dispatch(DataActions.setWeb3Config({ contractAddress, web3Provider }));

  return await reloadPlots(store, currentAddress);
};

const reloadPlots = async (store: Store<RootState>, account: string): Promise<Store<RootState>> => {
  await AccountActions.unregisterEventListners();
  store.dispatch(DataActions.clearPlots());
  await AccountActions.loadAndWatchEvents(store.getState().data.contractInfo, account || '0x0')(store.dispatch);
  return store;
};

const getBalance = async (account: string): Promise<BigNumber> => {
  const balance = await promisify(web3.eth.getBalance, [account]);
  return new BigNumber(balance);
};

contract('EthPlot', (accounts: string[]) => {
  let ethPlot: EthPlot;
  let store: Store<RootState>;
  beforeEach(async () => {
    const deployed = await ethPlotContract.deployed();
    ethPlot = await EthPlot.createAndValidate(web3, deployed.address);

    const provider = web3.currentProvider.host;
    store = await initializeStoreAndLoadPlots(ethPlot.address, provider, accounts[0]);
  });

  afterEach(async () => {
    await reloadPlots(store, accounts[0]);
  });

  after(async () => {
    await AccountActions.unregisterEventListners();
  });

  it('Contract initialized as expected', async () => {
    const loadedPlots = store.getState().data.plots;
    assert.equal(loadedPlots.length, 1);
    assert.deepEqual(loadedPlots[0].rect, { x: 0, y: 0, w: 250, h: 250, x2: 250, y2: 250 });
    assert.equal(loadedPlots[0].owner, accounts[0]);
  });

  it('Purchase a single plot', async () => {
    const state = store.getState();
    const rectToPurchase: Rect = { x: 25, y: 40, w: 12, h: 4, x2: 37, y2: 44 };
    const purchaseData = computePurchaseInfo(rectToPurchase, state.data.plots).purchaseData!;
    const purchaseUrl = 'https://spacedust.io/samms_test';
    const buyoutPrice = 4000;
    const ipfsHash = 'abcxyz123';

    const sellerAccount = accounts[0];
    const buyerAccount = accounts[4];
    const buyerBalanceOld = await getBalance(buyerAccount);
    const sellerBalanceOld = await getBalance(sellerAccount);
    const contractBalanceOld = await getBalance(ethPlot.address);

    const purchaseAction = DataActions.purchasePlot(
      state.data.contractInfo,
      state.data.plots,
      rectToPurchase,
      purchaseData.purchasePrice,
      purchaseUrl,
      ipfsHash,
      buyoutPrice.toString(),
      changePurchaseStep,
      buyerAccount);

    // Make the purchase
    const transactionHash = await purchaseAction(store.dispatch);

    // Reload the data and make sure that we have the right number of plots and right owners
    await reloadPlots(store, buyerAccount);

    const loadedPlots = store.getState().data.plots;
    assert.equal(loadedPlots.length, 2);
    assert.deepEqual(loadedPlots[1].rect, rectToPurchase);
    assert.equal(loadedPlots[1].owner, accounts[4]);

    // Look up some transaction info and make sure that the buyer's balance has decreased as expected
    const buyerBalanceNew = await getBalance(buyerAccount);
    const balanceDifference = buyerBalanceOld.sub(buyerBalanceNew);
    const blockInfo = <Web3.BlockWithoutTransactionData>(await promisify(web3.eth.getBlock, ['latest']));
    assert.equal(transactionHash, blockInfo.transactions[0]);
    const expectedDifference = new BigNumber(blockInfo.gasUsed).plus(new BigNumber(purchaseData.purchasePrice));
    assert.equal(expectedDifference.toString(), balanceDifference.toString());

    const sellerBalanceNew =  await getBalance(sellerAccount);
    const sellerBalanceDifference = sellerBalanceNew.minus(sellerBalanceOld);
    assert.equal(purchaseData.plotPrice, sellerBalanceDifference.toString());

    const contractBalanceNew = await getBalance(ethPlot.address);
    const contractBalanceDifference = contractBalanceNew.minus(contractBalanceOld);
    assert.equal(purchaseData.feePrice, contractBalanceDifference.toString());

    // Check that the owner can withdraw the funds
    const ownerAddress = await ethPlot.owner;
    const ownerBalanceOld = await getBalance(ownerAddress);
    const withdrawGasCost = await ethPlot.withdrawTx(ownerAddress).estimateGas({ from: ownerAddress, gas: STANDARD_GAS });
    await ethPlot.withdrawTx(ownerAddress).send({ from: ownerAddress, gas: STANDARD_GAS });
    const ownerBalanceNew = await getBalance(ownerAddress);
    assert.equal(new BigNumber(purchaseData.feePrice).minus(withdrawGasCost).toString(), ownerBalanceNew.minus(ownerBalanceOld).toString());

    // Finally, check that we got the sold event we're expecting
    const purchaseEvents = await ethPlot.PlotSectionSoldEvent({}).get({});
    assert.equal(1, purchaseEvents.length);
    assert.equal(buyerAccount, purchaseEvents[0].args.buyer);
    assert.equal(sellerAccount, purchaseEvents[0].args.seller);
    assert.equal(purchaseData.plotPrice, purchaseEvents[0].args.totalPrice.toString());
    assert.equal(0, purchaseEvents[0].args.plotId);
  });

  it('Purchase a bunch of plots', async() => {
    let totalGas = new BigNumber(0);
    const numPlotsBefore = store.getState().data.plots.length;

    // Shorten the number of iterations we're doing to 30
    const shortened = generated100.slice(10, 40);
    for (let index = 0; index < shortened.length; index++) {
      const rectInfo = shortened[index];
      console.log(`Purchasing: ${JSON.stringify(rectInfo.rect)}`);
      const state = store.getState();
      const rectToPurchase: Rect = rectInfo.rect;
      const purchaseInfo = computePurchaseInfo(rectToPurchase, state.data.plots);
      assert.isTrue(purchaseInfo.isValid);

      const purchaseData = purchaseInfo.purchaseData!;
      const purchaseUrl = '';
      const buyoutPrice = new BigNumber(purchaseData.purchasePrice).times(2);
      const ipfsHash = '';

      const buyerAccount = accounts[rectInfo.purchaser];

      const purchaseAction = DataActions.purchasePlot(
        state.data.contractInfo,
        state.data.plots,
        rectToPurchase,
        purchaseData.purchasePrice,
        purchaseUrl,
        ipfsHash,
        buyoutPrice.toString(),
        changePurchaseStep,
        buyerAccount);

      // Make the purchase
      const transactionHash = await purchaseAction(store.dispatch);
      const transactionInfo: Web3.TransactionReceipt = await promisify(web3.eth.getTransactionReceipt, [transactionHash]);
      const gasUsed = transactionInfo.gasUsed;
      totalGas = totalGas.plus(gasUsed);
      console.log(`Gas used after ${index} - ${totalGas.toString()}`);

      // Reload the data and make sure that we have the right number of plots and right owners
      await reloadPlots(store, accounts[0]);
    }

    // Make sure we bought enough plots
    const numPlotsAfter = store.getState().data.plots.length;
    assert.equal(numPlotsAfter, numPlotsBefore + shortened.length);

    // Make sure we're not averaging greater than 300,000 gas per transaction
    const acceptableCostPerTransaction = 300000;
    assert.isTrue(totalGas.dividedBy(shortened.length).lessThan(acceptableCostPerTransaction));
  });
});
