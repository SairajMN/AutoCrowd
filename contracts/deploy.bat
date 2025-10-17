@echo off
setlocal

REM Set environment variables
set PYUSD_CONTRACT_ADDRESS=0xd74Daa15B1Ec72837Ef158811ed9B95C27e49DdC7

REM Run the forge deployment script
forge script script/Deploy.s.sol --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast --verify --etherscan-api-key BPYDX34IK6CBW4PBDJQ4UX62IZPWPQ7KAD

endlocal
