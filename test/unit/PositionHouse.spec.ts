import {BigNumber, BigNumberish, Wallet} from 'ethers'
import {ethers, waffle} from 'hardhat'
// import {PositionHouse} from "../../typeChain";
import {loadFixture} from "ethereum-waffle";
// import checkObservationEquals from "../../shared/checkObservationEquals";
// import snapshotGasCost from "../../shared/snapshotGasCost";
// import {expect} from "../../shared/expect";
// import {TEST_POOL_START_TIME} from "../../shared/fixtures";
import {describe} from "mocha";
import {expect} from 'chai'
import {PositionManager, PositionHouse} from "../../typeChain";
import {priceToPip, toWeiBN, toWeiWithString} from "../shared/utilities";

const SIDE = {
    LONG: 0,
    SHORT: 1
}

interface PositionData {
    size: BigNumber
    margin: BigNumber
    openNotional: BigNumber
}

describe("PositionHouse", () => {
    let positionHouse: PositionHouse;
    let trader: any;
    let positionManager: PositionManager;
    beforeEach(async () => {
        [trader] = await ethers.getSigners()
        const positionManagerFactory = await ethers.getContractFactory("PositionManager")
        // BTC-USD Perpetual, initial price is 5000
        // each pip = 0.01
        // => initial pip = 500000
        positionManager = (await positionManagerFactory.deploy(500000)) as unknown as PositionManager;
        const factory = await ethers.getContractFactory("PositionHouse")
        positionHouse = (await factory.deploy()) as unknown as PositionHouse;
    })

    describe('openMarketPosition', async () => {
        const openMarketPosition = async ({
                                              size,
                                              leverage,
                                              side,
                                              trader,
                                              expectedMargin,
                                              expectedNotional,
                                              expectedSize,
                                              price = 5000
                                          }: {
            size: BigNumber,
            leverage: number,
            side: number,
            trader: string,
            expectedMargin?: BigNumber,
            expectedNotional?: BigNumber | string,
            expectedSize?: BigNumber,
            price?: number
        }) => {
            await positionHouse.openMarketPosition(
                positionManager.address,
                side,
                size,
                leverage,
            )
            const positionInfo = await positionHouse.getPosition(positionManager.address, trader) as unknown as PositionData;
            console.log("positionInfo", positionInfo)
            const openNotional = positionInfo.openNotional.div('10000').toString()
            expectedNotional = expectedNotional && expectedNotional.toString() || size.mul(price).mul(leverage.toString()).toString()

            expect(positionInfo.size.toString()).eq(expectedSize || size.toString())
            expect(openNotional).eq(expectedNotional)
            expectedMargin && expect(positionInfo.margin.div('10000').toString()).eq(expectedMargin.toString())
        }


        it('should open market a position', async function () {
            const [trader] = await ethers.getSigners()
            const size = toWeiBN('1')
            console.log(size)
            const leverage = 10
            await positionManager.openLimitPosition(
                priceToPip(5000),
                toWeiBN('10'),
                true
            );

            await openMarketPosition({
                    size: size,
                    leverage: leverage,
                    side: SIDE.SHORT,
                    trader: trader.address
                }
            );


        });

        describe('get PnL', function () {
            it('should get PnL market', async function () {

                await positionManager.openLimitPosition(
                    priceToPip(5000),
                    '20',
                    true
                );
                await openMarketPosition({
                    size: BigNumber.from('2'),
                    side: SIDE.SHORT,
                    trader: trader.address,
                    leverage: 10
                });
                const positionNotionalAndPnL = await positionHouse.getPositionNotionalAndUnrealizedPnl(
                    positionManager.address,
                    trader.address,
                    1
                )
                console.log("positionNotionalAndPnL ", positionNotionalAndPnL.toString())
                expect(positionNotionalAndPnL.unrealizedPnl).eq(0)

            });
        });

        describe('should reduce current position', async function () {
            it('pnl = 0', async function () {
                await positionManager.openLimitPosition(
                    priceToPip(5000),
                    '20',
                    true
                );
                await openMarketPosition({
                    size: BigNumber.from('2'),
                    leverage: 10,
                    side: SIDE.SHORT,
                    trader: trader.address
                })
                await positionManager.openLimitPosition(
                    priceToPip(5000),
                    toWeiBN('10'),
                    false
                );
                await openMarketPosition({
                    size: BigNumber.from('1'),
                    side: SIDE.LONG,
                    leverage: 10,
                    trader: trader.address,
                    expectedSize: BigNumber.from('1'),
                    expectedNotional: BigNumber.from('50000'),
                    expectedMargin: BigNumber.from('500')
                })
            });


            it('should pnl > 0', async function () {

            });

            it('should pnl < 0', async function () {

            });
        });
    })

    describe('openLimitPosition', async () => {

        it('should open limit a position', async function () {
            await positionHouse.openLimitPosition(
                positionManager.address,
                1,
                ethers.utils.parseEther('10000'),
                ethers.utils.parseEther('5.22'),
                10,
            );

        });

    })
})