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
    const { documentType, details, jurisdiction } = await req.json();
    
    console.log('Generating document:', { documentType, jurisdiction });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert legal document drafting AI assistant. Generate professional, legally sound documents based on the provided requirements. 

IMPORTANT INSTRUCTIONS:
- Generate complete, ready-to-use legal documents
- Include all necessary clauses and sections
- Use proper legal terminology and formatting
- Add placeholders in [BRACKETS] for specific details that need to be filled
- Ensure compliance with standard legal practices
- Include appropriate headers, sections, and signatures blocks
- Make documents comprehensive and professionally formatted`;

    const userPrompt = `Generate a complete ${documentType} document with the following details:

${details}

Jurisdiction: ${jurisdiction}

Please create a comprehensive, professional legal document that includes:
1. Proper title and heading
2. All necessary legal clauses
3. Clear section numbering
4. Signature blocks
5. Date and location placeholders
6. All standard provisions for this document type

Format it as a complete, ready-to-use document.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
    const generatedDocument = data.choices[0].message.content;

    console.log('Document generated successfully');

    return new Response(
      JSON.stringify({ document: generatedDocument }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});