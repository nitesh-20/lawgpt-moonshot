import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, documentType, jurisdiction } = await req.json();
    
    console.log('Checking compliance:', { documentType, jurisdiction, textLength: documentText.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert legal compliance analyzer with deep knowledge of regulations, statutes, and legal requirements across multiple jurisdictions. Your task is to analyze legal documents for compliance issues and provide detailed risk assessments.

ANALYSIS REQUIREMENTS:
1. Identify ALL compliance issues - critical, warnings, and minor concerns
2. Calculate an accurate risk percentage (0-100%)
3. Identify specific problematic clauses and sections
4. Provide specific legal references and regulations
5. Suggest concrete remediation steps

Output your analysis in this exact JSON format:
{
  "riskPercentage": <number 0-100>,
  "overallAssessment": "<brief summary>",
  "criticalIssues": [
    {
      "title": "<issue title>",
      "description": "<detailed description>",
      "section": "<affected section>",
      "legalReference": "<specific law/regulation>",
      "remediation": "<how to fix it>"
    }
  ],
  "warnings": [
    {
      "title": "<issue title>",
      "description": "<detailed description>",
      "section": "<affected section>",
      "legalReference": "<specific law/regulation>",
      "remediation": "<how to fix it>"
    }
  ],
  "compliantAspects": ["<list of things that are compliant>"],
  "suggestedImprovements": ["<list of suggested improvements>"]
}`;

    const userPrompt = `Analyze the following ${documentType} document for compliance issues:

Jurisdiction: ${jurisdiction}
Document Type: ${documentType}

DOCUMENT TEXT:
${documentText}

Provide a comprehensive compliance analysis with:
1. Risk percentage based on severity and number of issues
2. All critical compliance failures that could result in legal liability
3. Warnings about potential issues that should be addressed
4. Aspects that are currently compliant
5. Suggested improvements for better compliance

Be thorough and specific. Reference actual laws and regulations where applicable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let analysisText = data.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      analysisText = jsonMatch[1];
    }
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    console.log('Compliance check completed:', { riskPercentage: analysis.riskPercentage });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-compliance function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});