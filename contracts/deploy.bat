@echo off
setlocal

REM Set environment variables
set PYUSD_CONTRACT_ADDRESS=0x6951DCad9Ef99075DF2f13657dbe879d49C3EDd8

REM Run the forge deployment script
forge script script/Deploy.s.sol --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast --verify --etherscan-api-key BPYDX34IK6CBW4PBDJQ4UX62IZPWPQ7KAD

endlocal
