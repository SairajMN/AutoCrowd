@echo off
setlocal

REM Set environment variables
set PYUSD_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

REM Run the forge deployment script
forge script script/Deploy.s.sol --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast --verify --etherscan-api-key BPYDX34IK6CBW4PBDJQ4UX62IZPWPQ7KAD

endlocal
