#!/usr/bin/env python3
"""
ASI Agent for Milestone Verification
Integrates with ASI Alliance ecosystem for AI-powered milestone verification
"""

import asyncio
import json
import logging
import os
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime

# ASI Alliance imports
from uagents import Agent, Context
from uagents.network import Network
import requests
from web3 import Web3
from singularitynet_sdk import MeTTaClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MilestoneVerifierAgent:
    """
    ASI Agent for verifying crowdfunding campaign milestones
    """
    
    def __init__(self):
        self.agent_name = "MilestoneVerifier"
        self.network = Network.testnet()  # or Network.testnet() for testing
        self.agent = Agent(
            name=self.agent_name,
            network=self.network
        )
        
        # Initialize ASI services
        self.metta_client = MeTTaClient(
            endpoint=os.getenv('METTA_KNOWLEDGE_GRAPH_URL', 'https://metta.asi.one')
        )
        
        # Web3 connection
        self.web3 = Web3(Web3.HTTPProvider(os.getenv('ETH_RPC_URL')))
        
        # Configuration
        self.confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', '0.8'))
        self.max_retry_attempts = int(os.getenv('MAX_RETRY_ATTEMPTS', '3'))
        
        # Register message handlers
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup message handlers for the agent"""
        
        @self.agent.on_message()
        async def handle_verification_request(ctx: Context, sender: str, msg: Dict):
            """Handle milestone verification requests"""
            try:
                logger.info(f"Received verification request from {sender}: {msg}")
                
                # Process verification request
                result = await self.verify_milestone(msg)
                
                # Send response back
                await ctx.send(sender, {
                    "type": "verification_result",
                    "request_id": msg.get("request_id"),
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Error processing verification request: {e}")
                await ctx.send(sender, {
                    "type": "verification_error",
                    "request_id": msg.get("request_id"),
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    async def verify_milestone(self, request: Dict) -> Dict:
        """
        Verify a milestone submission using ASI ecosystem
        
        Args:
            request: Verification request containing milestone data
            
        Returns:
            Dict containing verification result
        """
        try:
            logger.info(f"Starting verification for milestone {request.get('milestone_id')}")
            
            # Extract request data
            milestone_id = request.get('milestone_id')
            campaign_address = request.get('campaign_address')
            evidence_hash = request.get('evidence_hash')
            evidence_url = request.get('evidence_url')
            description = request.get('description', '')
            
            # Step 1: Analyze evidence using MeTTa knowledge graph
            evidence_analysis = await self.analyze_evidence(
                evidence_hash=evidence_hash,
                evidence_url=evidence_url,
                description=description
            )
            
            # Step 2: Get ASI agent verdict using AgentVerse
            agent_verdict = await self.get_agent_verdict(
                milestone_id=milestone_id,
                campaign_address=campaign_address,
                evidence_analysis=evidence_analysis,
                description=description
            )
            
            # Step 3: Combine results and make final decision
            final_result = self.combine_results(evidence_analysis, agent_verdict)
            
            logger.info(f"Verification completed for milestone {milestone_id}")
            return final_result
            
        except Exception as e:
            logger.error(f"Verification failed for milestone {request.get('milestone_id')}: {e}")
            return {
                "verdict": "uncertain",
                "confidence": 0.0,
                "reasoning": f"Verification failed: {str(e)}",
                "error": str(e)
            }
    
    async def analyze_evidence(self, evidence_hash: str, evidence_url: str = None, description: str = "") -> Dict:
        """
        Analyze evidence using MeTTa knowledge graph
        
        Args:
            evidence_hash: IPFS hash of evidence
            evidence_url: URL to evidence (optional)
            description: Milestone description
            
        Returns:
            Dict containing evidence analysis
        """
        try:
            logger.info(f"Analyzing evidence: {evidence_hash}")
            
            # Query MeTTa knowledge graph for evidence analysis
            query = {
                "evidence_hash": evidence_hash,
                "evidence_url": evidence_url,
                "description": description,
                "analysis_type": "milestone_verification"
            }
            
            # Use MeTTa client to analyze evidence
            response = await self.metta_client.query(
                query=query,
                context="milestone_verification"
            )
            
            # Parse response
            analysis = {
                "relevance": response.get("relevance", 0.5),
                "completeness": response.get("completeness", 0.5),
                "authenticity": response.get("authenticity", 0.5),
                "reasoning": response.get("reasoning", "Evidence analysis completed"),
                "metadata": response.get("metadata", {})
            }
            
            logger.info(f"Evidence analysis completed: {analysis}")
            return analysis
            
        except Exception as e:
            logger.error(f"Evidence analysis failed: {e}")
            return {
                "relevance": 0.5,
                "completeness": 0.5,
                "authenticity": 0.5,
                "reasoning": f"Evidence analysis failed: {str(e)}",
                "metadata": {}
            }
    
    async def get_agent_verdict(self, milestone_id: str, campaign_address: str, 
                              evidence_analysis: Dict, description: str) -> Dict:
        """
        Get ASI agent verdict using AgentVerse
        
        Args:
            milestone_id: Milestone identifier
            campaign_address: Campaign contract address
            evidence_analysis: Results from evidence analysis
            description: Milestone description
            
        Returns:
            Dict containing agent verdict
        """
        try:
            logger.info(f"Getting agent verdict for milestone {milestone_id}")
            
            # Prepare agent request
            agent_request = {
                "task": "milestone_verification",
                "context": {
                    "milestone_id": milestone_id,
                    "campaign_address": campaign_address,
                    "description": description,
                    "evidence_analysis": evidence_analysis
                },
                "parameters": {
                    "confidence_threshold": self.confidence_threshold,
                    "analysis_depth": "comprehensive"
                }
            }
            
            # Send request to ASI:One chat protocol
            response = await self.call_asi_one_chat(agent_request)
            
            # Parse agent response
            verdict = {
                "approved": response.get("approved", False),
                "confidence": response.get("confidence", 0.5),
                "reasoning": response.get("reasoning", "Agent analysis completed"),
                "recommendations": response.get("recommendations", [])
            }
            
            logger.info(f"Agent verdict: {verdict}")
            return verdict
            
        except Exception as e:
            logger.error(f"Agent verdict failed: {e}")
            return {
                "approved": False,
                "confidence": 0.0,
                "reasoning": f"Agent verdict failed: {str(e)}",
                "recommendations": []
            }
    
    async def call_asi_one_chat(self, request: Dict) -> Dict:
        """
        Call ASI:One chat protocol for agent interaction

        Args:
            request: Agent request data

        Returns:
            Dict containing agent response
        """
        try:
            # Use real ASI:One endpoint for hackathon prize eligibility
            asi_endpoint = os.getenv('ASI_ENDPOINT', 'https://api.asi.one')
            api_key = os.getenv('ASI_API_KEY')

            if not api_key:
                logger.warning("ASI_API_KEY not provided, falling back to mock for development")
                logger.info("To enable real ASI integration, set ASI_API_KEY environment variable")
                return self.get_mock_agent_response(request)

            # Call real ASI:One chat API with proper authentication
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-API-Key": api_key,  # Additional auth header
                "User-Agent": "AutoCrowd-MilestoneVerifier/1.0"
            }

            logger.info(f"Calling ASI:One chat API: {asi_endpoint}/chat/agent")

            # Call ASI:One chat protocol for real milestone verification
            response = requests.post(
                f"{asi_endpoint}/chat/agent",
                json=request,
                headers=headers,
                timeout=120  # Increased timeout for complex AI processing
            )

            response.raise_for_status()
            result = response.json()

            logger.info("Successfully received response from ASI:One chat protocol")
            return result

        except requests.exceptions.HTTPError as e:
            logger.error(f"ASI:One API HTTP error: {e.response.status_code} - {e.response.text}")
            return self.get_mock_agent_response(request)
        except requests.exceptions.Timeout as e:
            logger.error(f"ASI:One API timeout: {e}")
            return self.get_mock_agent_response(request)
        except Exception as e:
            logger.error(f"ASI:One chat call failed: {e}")
            return self.get_mock_agent_response(request)
    
    def get_mock_agent_response(self, request: Dict) -> Dict:
        """
        Generate mock agent response for development/testing
        
        Args:
            request: Agent request data
            
        Returns:
            Dict containing mock response
        """
        # Simple mock logic based on request data
        description = request.get("context", {}).get("description", "")
        evidence_analysis = request.get("context", {}).get("evidence_analysis", {})
        
        # Calculate mock confidence based on description length and evidence analysis
        base_confidence = 0.5
        if description and len(description) > 50:
            base_confidence += 0.2
        if evidence_analysis.get("relevance", 0.5) > 0.7:
            base_confidence += 0.2
        if evidence_analysis.get("completeness", 0.5) > 0.7:
            base_confidence += 0.1
        
        confidence = min(base_confidence, 1.0)
        approved = confidence >= self.confidence_threshold
        
        return {
            "approved": approved,
            "confidence": confidence,
            "reasoning": f"Mock agent analysis: Description length={len(description)}, Evidence relevance={evidence_analysis.get('relevance', 0.5):.2f}",
            "recommendations": [
                "Consider providing more detailed evidence",
                "Ensure milestone deliverables are clearly defined"
            ]
        }
    
    def combine_results(self, evidence_analysis: Dict, agent_verdict: Dict) -> Dict:
        """
        Combine evidence analysis and agent verdict into final result
        
        Args:
            evidence_analysis: Evidence analysis results
            agent_verdict: Agent verdict results
            
        Returns:
            Dict containing final verification result
        """
        # Weight the different components
        evidence_weight = 0.4
        agent_weight = 0.6
        
        # Calculate evidence score
        evidence_score = (
            evidence_analysis.get("relevance", 0.5) * 0.4 +
            evidence_analysis.get("completeness", 0.5) * 0.3 +
            evidence_analysis.get("authenticity", 0.5) * 0.3
        )
        
        # Combine with agent verdict
        combined_confidence = (
            evidence_score * evidence_weight +
            agent_verdict.get("confidence", 0.5) * agent_weight
        )
        
        # Determine final verdict
        if (combined_confidence >= self.confidence_threshold and 
            agent_verdict.get("approved", False)):
            verdict = "approved"
        elif (combined_confidence < (1 - self.confidence_threshold) or 
              not agent_verdict.get("approved", False)):
            verdict = "rejected"
        else:
            verdict = "uncertain"
        
        return {
            "verdict": verdict,
            "confidence": combined_confidence,
            "reasoning": f"{evidence_analysis.get('reasoning', '')}. {agent_verdict.get('reasoning', '')}",
            "details": {
                "evidence_analysis": evidence_analysis,
                "agent_verdict": agent_verdict,
                "combined_score": combined_confidence
            }
        }
    
    async def start(self):
        """Start the agent"""
        try:
            logger.info(f"Starting {self.agent_name} agent...")
            await self.agent.run()
        except Exception as e:
            logger.error(f"Failed to start agent: {e}")
            raise
    
    async def stop(self):
        """Stop the agent"""
        try:
            logger.info(f"Stopping {self.agent_name} agent...")
            # Add cleanup logic here
        except Exception as e:
            logger.error(f"Error stopping agent: {e}")

def main():
    """Main function to run the agent"""
    try:
        # Create and start the agent
        agent = MilestoneVerifierAgent()
        
        # Run the agent
        asyncio.run(agent.start())
        
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
    except Exception as e:
        logger.error(f"Agent failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
