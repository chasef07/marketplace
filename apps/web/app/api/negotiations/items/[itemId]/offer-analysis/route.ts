import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { itemId: itemIdStr } = await params
    const itemId = parseInt(itemIdStr)

    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('seller_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found or not authorized' }, { status: 404 })
    }

    // Get all offers for this item with buyer info
    const { data: negotiations, error: negotiationsError } = await supabase
      .from('negotiations')
      .select(`
        *,
        buyer:buyer_id (
          username,
          buyer_personality
        ),
        offers (
          price,
          message,
          offer_type,
          created_at
        )
      `)
      .eq('item_id', itemId)
      .eq('status', 'active')

    if (negotiationsError) {
      console.error('Error fetching negotiations:', negotiationsError)
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
    }

    if (!negotiations || negotiations.length === 0) {
      return NextResponse.json({
        priority_offers: [],
        fair_offers: [],
        lowball_offers: [],
        recommendations: ['No offers received yet. Consider adjusting your price or improving your listing.'],
        market_insights: {
          average_offer_percentage: 0,
          buyer_engagement_level: 'None',
          pricing_strategy: 'Wait for offers'
        },
        analysis_metadata: {
          generated_at: new Date().toISOString(),
          total_offers_analyzed: 0,
          total_buyers_analyzed: 0
        }
      })
    }

    // Categorize offers
    const priority_offers: any[] = []
    const fair_offers: any[] = []
    const lowball_offers: any[] = []

    let totalOfferValue = 0
    const startingPrice = item.starting_price

    negotiations.forEach((negotiation: any) => {
      const currentOffer = negotiation.current_offer
      const percentage = (currentOffer / startingPrice) * 100
      
      totalOfferValue += currentOffer

      const offerData = {
        buyer_info: negotiation.buyer?.username || 'Anonymous',
        current_offer: currentOffer,
        percentage_of_asking: Math.round(percentage),
        reason: `${negotiation.buyer?.buyer_personality || 'Standard'} buyer offering ${Math.round(percentage)}% of asking price`
      }

      if (percentage >= 85) {
        priority_offers.push(offerData)
      } else if (percentage >= 70) {
        fair_offers.push(offerData)
      } else {
        lowball_offers.push(offerData)
      }
    })

    // Generate AI recommendations
    const offerContext = `
    Item: ${item.name}
    Starting Price: $${startingPrice}
    Priority Offers (85%+): ${priority_offers.length}
    Fair Offers (70-84%): ${fair_offers.length}
    Lowball Offers (<70%): ${lowball_offers.length}
    Average Offer: $${Math.round(totalOfferValue / negotiations.length)}
    `

    const prompt = `You are an expert negotiation advisor for furniture sales. Based on this offer analysis, provide 3-4 specific, actionable recommendations for the seller. Keep each recommendation under 20 words and focus on strategy:

    ${offerContext}

    Provide only the recommendations as a JSON array of strings.`

    let recommendations: string[] = []
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      })

      const aiContent = response.choices[0]?.message?.content
      if (aiContent) {
        recommendations = JSON.parse(aiContent)
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      // Fallback recommendations
      recommendations = [
        priority_offers.length > 0 ? "You have strong offers! Consider accepting the highest priority offer." : "No high offers yet. Your price may be too high for the market.",
        fair_offers.length > 0 ? "Fair offers indicate good interest. Counter slightly below asking price." : "Consider reducing price by 10-15% to attract more buyers.",
        lowball_offers.length > 2 ? "Many low offers suggest market price is lower than expected." : "Be patient and wait for better offers if item has unique value."
      ]
    }

    const averageOfferPercentage = Math.round((totalOfferValue / negotiations.length / startingPrice) * 100)
    
    let engagementLevel = 'Low'
    if (negotiations.length >= 5) engagementLevel = 'High'
    else if (negotiations.length >= 2) engagementLevel = 'Moderate'

    let pricingStrategy = 'Hold firm'
    if (averageOfferPercentage < 60) pricingStrategy = 'Consider significant price reduction'
    else if (averageOfferPercentage < 75) pricingStrategy = 'Consider modest price reduction'
    else if (priority_offers.length > 0) pricingStrategy = 'Accept best offer'

    return NextResponse.json({
      priority_offers,
      fair_offers,
      lowball_offers,
      recommendations,
      market_insights: {
        average_offer_percentage: averageOfferPercentage,
        buyer_engagement_level: engagementLevel,
        pricing_strategy: pricingStrategy
      },
      analysis_metadata: {
        generated_at: new Date().toISOString(),
        total_offers_analyzed: negotiations.length,
        total_buyers_analyzed: negotiations.length
      }
    })
  } catch (error) {
    console.error('Offer analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}