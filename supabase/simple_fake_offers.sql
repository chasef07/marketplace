-- Simplified fake offers - just create negotiations and offers for existing items
-- This bypasses the user creation issues

DO $$
DECLARE
    seller_uuid uuid;
    item_record RECORD;
    neg_id bigint;
    fake_buyers uuid[] := ARRAY[
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid(),
        gen_random_uuid()
    ];
    buyer_names text[] := ARRAY[
        'Mike Johnson',
        'Sarah Wilson', 
        'David Brown',
        'Lisa Davis',
        'John Miller',
        'Emily Taylor',
        'Robert Anderson',
        'Jennifer Thomas'
    ];
    buyer_messages text[] := ARRAY[
        'Hi! I love this piece. I have a truck and can pick up this weekend. Would you consider this offer?',
        'Would you take this cash today?',
        'Beautiful item! Is it in excellent condition? I can offer this amount and am very interested.',
        'Hi! This would be perfect for our new home. Could you do this price? Happy to pick up anytime.',
        'Best I can do is this amount. Let me know!',
        'OMG this is exactly what I''ve been looking for! Please say yes! 🙏',
        'Interested in your item. Would you consider this offer?',
        'Cash offer - can pick up today if you accept!'
    ];
    i integer;
    offer_multipliers numeric[] := ARRAY[0.83, 0.59, 0.95, 0.89, 0.69, 0.94, 0.85, 0.75];
BEGIN
    -- Get kyleshechtman's UUID
    SELECT id INTO seller_uuid FROM public.profiles WHERE username = 'kyleshechtman' LIMIT 1;
    
    IF seller_uuid IS NULL THEN
        RAISE NOTICE 'Could not find kyleshechtman user';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found seller UUID: %', seller_uuid;
    
    -- Create fake buyer profiles first
    FOR i IN 1..8 LOOP
        INSERT INTO public.profiles (id, username, email, seller_personality, buyer_personality, created_at, updated_at)
        VALUES (
            fake_buyers[i], 
            buyer_names[i], 
            lower(replace(buyer_names[i], ' ', '.')) || '@email.com',
            'flexible', 
            'fair', 
            now() - interval '1 day', 
            now() - interval '1 day'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created fake buyer profiles';
    
    -- Create negotiations and offers for all of kyleshechtman's items
    i := 1;
    FOR item_record IN 
        SELECT id, name, starting_price FROM public.items 
        WHERE seller_id = seller_uuid 
        AND is_available = true
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'Creating offers for item: % (ID: %, Price: $%)', item_record.name, item_record.id, item_record.starting_price;
        
        -- Create 3-6 offers per item (varying amounts)
        FOR j IN 1..LEAST(6, 8) LOOP
            IF i > 8 THEN i := 1; END IF; -- Reset counter
            
            -- Create negotiation
            INSERT INTO public.negotiations (
                item_id, 
                seller_id, 
                buyer_id, 
                status, 
                current_offer, 
                round_number, 
                created_at, 
                updated_at
            )
            VALUES (
                item_record.id,
                seller_uuid,
                fake_buyers[i],
                'active',
                ROUND(item_record.starting_price * offer_multipliers[i]),
                1,
                now() - (j * 2 || ' hours')::interval,
                now() - (j * 2 || ' hours')::interval
            )
            RETURNING id INTO neg_id;
            
            -- Create the offer
            INSERT INTO public.offers (
                negotiation_id,
                offer_type,
                price,
                message,
                round_number,
                is_counter_offer,
                created_at
            )
            VALUES (
                neg_id,
                'buyer',
                ROUND(item_record.starting_price * offer_multipliers[i]),
                buyer_messages[i],
                1,
                false,
                now() - (j * 2 || ' hours')::interval
            );
            
            RAISE NOTICE 'Created offer from % for $% (%.1f%% of asking)', buyer_names[i], ROUND(item_record.starting_price * offer_multipliers[i]), offer_multipliers[i] * 100;
            
            i := i + 1;
        END LOOP;
        
        -- Only process first 2 items to avoid too many offers
        EXIT WHEN i > 12;
    END LOOP;
    
    RAISE NOTICE 'Fake offers creation completed!';
END $$;