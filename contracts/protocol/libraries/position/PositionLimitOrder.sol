pragma solidity ^0.8.0;
import "./Position.sol";
import "hardhat/console.sol";
import "../../../interfaces/IPositionManager.sol";

library PositionLimitOrder {
    enum OrderType {
        OPEN_LIMIT,
        CLOSE_LIMIT
    }
    struct Data {
        int128 pip;
        uint64 orderId;
        uint16 leverage;
//        OrderType typeLimitOrder;
        uint8 isBuy;
        uint256 entryPrice;
        uint256 reduceQuantity;
    }

    struct ReduceData {
        int128 pip;
        uint64 orderId;
        uint16 leverage;
//        OrderType typeLimitOrder;
        uint8 isBuy;
    }

    function checkFilledToSelfOrders(
        mapping(address => mapping(address => PositionLimitOrder.Data[])) storage limitOrderMap,
        IPositionManager _positionManager,
        address _trader,
        int128 startPip,
        int128 endPip,
        Position.Side side
    ) internal view returns (uint256 selfFilledQuantity) {
        uint256 gasBefore = gasleft();
        // check if fill to self limit orders
        PositionLimitOrder.Data[] memory listLimitOrder = limitOrderMap[address(_positionManager)][_trader];
        for(uint256 i; i<listLimitOrder.length; i++){
            PositionLimitOrder.Data memory limitOrder = listLimitOrder[i];
            if(limitOrder.isBuy == 1 && side == Position.Side.SHORT){
                if(endPip <= limitOrder.pip && startPip >= limitOrder.pip){
                    (,,uint256 size, uint256 partialFilledSize) = _positionManager.getPendingOrderDetail(limitOrder.pip, limitOrder.orderId);
                    selfFilledQuantity += (size > partialFilledSize ? size - partialFilledSize : size);
                }
            }
            if(limitOrder.isBuy == 2 && side == Position.Side.LONG){
                if(endPip >= limitOrder.pip){
                    (,,uint256 size, uint256 partialFilledSize) = _positionManager.getPendingOrderDetail(limitOrder.pip, limitOrder.orderId);
                    selfFilledQuantity += (size > partialFilledSize ? size - partialFilledSize : size);
                }
            }
        }
        console.log("gas spent checkFilledToSelfOrders", gasBefore - gasleft());
    }

}