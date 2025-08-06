'use client'

import { useState, useEffect } from 'react'

export function LivingRoomScene() {
  const [soldItems, setSoldItems] = useState<string[]>([])

  // Simulate recently sold items
  useEffect(() => {
    const interval = setInterval(() => {
      setSoldItems(prev => {
        const items = ['couch', 'lamp', 'table']
        const randomItem = items[Math.floor(Math.random() * items.length)]
        
        // Toggle sold status
        if (prev.includes(randomItem)) {
          return prev.filter(item => item !== randomItem)
        } else {
          return [...prev.slice(-1), randomItem] // Keep only 2 items max
        }
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="living-room-scene">
      {/* Floor */}
      <div className="floor"></div>
      
      {/* Back Wall */}
      <div className="back-wall"></div>
      
      {/* Area Rug */}
      <div className="area-rug"></div>
      
      {/* Furniture Items */}
      
      {/* Couch */}
      <div className={`furniture couch ${soldItems.includes('couch') ? 'recently-sold' : ''}`}>
        <div className="couch-back"></div>
        <div className="couch-seat"></div>
        <div className="couch-arm couch-arm-left"></div>
        <div className="couch-arm couch-arm-right"></div>
        <div className="couch-cushion cushion-1"></div>
        <div className="couch-cushion cushion-2"></div>
        <div className="couch-cushion cushion-3"></div>
        
        {soldItems.includes('couch') && (
          <div className="sold-badge couch-sold">
            <span>SOLD!</span>
            <div className="price-tag">$1,200</div>
          </div>
        )}
      </div>
      
      {/* Coffee Table */}
      <div className={`furniture coffee-table ${soldItems.includes('table') ? 'recently-sold' : ''}`}>
        <div className="table-top"></div>
        <div className="table-leg leg-1"></div>
        <div className="table-leg leg-2"></div>
        <div className="table-leg leg-3"></div>
        <div className="table-leg leg-4"></div>
        
        {soldItems.includes('table') && (
          <div className="sold-badge table-sold">
            <span>SOLD!</span>
            <div className="price-tag">$350</div>
          </div>
        )}
      </div>
      
      {/* Floor Lamp */}
      <div className={`furniture floor-lamp ${soldItems.includes('lamp') ? 'recently-sold' : ''}`}>
        <div className="lamp-shade"></div>
        <div className="lamp-pole"></div>
        <div className="lamp-base"></div>
        <div className="lamp-glow"></div>
        
        {soldItems.includes('lamp') && (
          <div className="sold-badge lamp-sold">
            <span>SOLD!</span>
            <div className="price-tag">$150</div>
          </div>
        )}
      </div>
      
      {/* Bookshelf */}
      <div className="furniture bookshelf">
        <div className="shelf shelf-1">
          <div className="book book-1"></div>
          <div className="book book-2"></div>
          <div className="book book-3"></div>
        </div>
        <div className="shelf shelf-2">
          <div className="book book-4"></div>
          <div className="book book-5"></div>
        </div>
        <div className="shelf shelf-3">
          <div className="book book-6"></div>
          <div className="book book-7"></div>
          <div className="book book-8"></div>
        </div>
      </div>
      
      {/* Plant */}
      <div className="decoration plant">
        <div className="pot"></div>
        <div className="plant-stem"></div>
        <div className="plant-leaf leaf-1"></div>
        <div className="plant-leaf leaf-2"></div>
        <div className="plant-leaf leaf-3"></div>
      </div>

      <style jsx>{`
        .living-room-scene {
          position: relative;
          width: 100%;
          height: 100%;
          perspective: 1000px;
          transform-style: preserve-3d;
        }

        /* Room Structure */
        .floor {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(45deg, #D2B48C 25%, transparent 25%),
                      linear-gradient(-45deg, #D2B48C 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #DDD1C7 75%),
                      linear-gradient(-45deg, transparent 75%, #DDD1C7 75%);
          background-size: 30px 30px;
          background-position: 0 0, 0 15px, 15px -15px, -15px 0px;
          transform: rotateX(60deg);
          transform-origin: bottom;
        }

        .back-wall {
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 70%;
          background: linear-gradient(90deg, 
            #8B4513 0px, #8B4513 4px, 
            #CD853F 4px, #CD853F 8px,
            #8B4513 8px, #8B4513 12px,
            #CD853F 12px, #CD853F 16px
          );
          background-size: 16px 100%;
          opacity: 0.3;
          border-radius: 8px;
        }

        .area-rug {
          position: absolute;
          bottom: 150px;
          left: 25%;
          right: 15%;
          height: 200px;
          background: radial-gradient(ellipse, #8B4513 30%, #CD853F 60%, #D2B48C 90%);
          border-radius: 50%;
          transform: rotateX(75deg) scale(1, 0.6);
          opacity: 0.7;
        }

        /* Furniture Base Styles */
        .furniture {
          position: absolute;
          transition: all 0.3s ease;
        }

        .furniture:hover {
          transform: translateY(-5px);
        }

        .recently-sold {
          animation: pulse-sold 2s infinite;
        }

        @keyframes pulse-sold {
          0%, 100% { 
            transform: scale(1) translateY(0);
            box-shadow: 0 0 0 rgba(139, 69, 19, 0.4);
          }
          50% { 
            transform: scale(1.05) translateY(-3px);
            box-shadow: 0 10px 25px rgba(139, 69, 19, 0.4);
          }
        }

        /* Couch */
        .couch {
          bottom: 180px;
          left: 15%;
          width: 300px;
          height: 150px;
        }

        .couch-back {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 20px 20px 8px 8px;
          box-shadow: inset 0 -10px 20px rgba(0,0,0,0.2);
        }

        .couch-seat {
          position: absolute;
          bottom: 0;
          left: 20px;
          right: 20px;
          height: 70px;
          background: linear-gradient(135deg, #A0522D, #CD853F);
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .couch-arm {
          position: absolute;
          top: 10px;
          width: 40px;
          height: 100px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .couch-arm-left {
          left: 0;
        }

        .couch-arm-right {
          right: 0;
        }

        .couch-cushion {
          position: absolute;
          bottom: 40px;
          width: 70px;
          height: 20px;
          background: linear-gradient(135deg, #CD853F, #D2B48C);
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .cushion-1 { left: 45px; }
        .cushion-2 { left: 125px; }
        .cushion-3 { left: 205px; }

        /* Coffee Table */
        .coffee-table {
          bottom: 200px;
          left: 40%;
          width: 120px;
          height: 80px;
        }

        .table-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(135deg, #8B4513, #CD853F);
          border-radius: 8px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }

        .table-leg {
          position: absolute;
          width: 8px;
          height: 60px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 4px;
          bottom: 0;
        }

        .leg-1 { left: 10px; top: 20px; }
        .leg-2 { right: 10px; top: 20px; }
        .leg-3 { left: 10px; bottom: 0; }
        .leg-4 { right: 10px; bottom: 0; }

        /* Floor Lamp */
        .floor-lamp {
          bottom: 160px;
          right: 25%;
          width: 60px;
          height: 250px;
        }

        .lamp-shade {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 60px;
          background: linear-gradient(135deg, #F7F3E9, #E8DDD4);
          border-radius: 50% 50% 20% 20%;
          box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }

        .lamp-pole {
          position: absolute;
          left: 50%;
          top: 50px;
          width: 6px;
          height: 160px;
          background: linear-gradient(135deg, #8B4513, #CD853F);
          border-radius: 3px;
          transform: translateX(-50%);
        }

        .lamp-base {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 30px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 50%;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .lamp-glow {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(255,248,220,0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: lamp-glow 3s ease-in-out infinite;
        }

        @keyframes lamp-glow {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.1); }
        }

        /* Bookshelf */
        .bookshelf {
          bottom: 160px;
          right: 5%;
          width: 80px;
          height: 200px;
        }

        .shelf {
          position: absolute;
          left: 0;
          right: 0;
          height: 8px;
          background: linear-gradient(135deg, #8B4513, #CD853F);
          border-radius: 4px;
          display: flex;
          align-items: end;
          padding: 0 5px;
          gap: 2px;
        }

        .shelf-1 { top: 40px; }
        .shelf-2 { top: 100px; }
        .shelf-3 { top: 160px; }

        .book {
          width: 8px;
          height: 30px;
          border-radius: 2px 2px 0 0;
          box-shadow: 1px 0 2px rgba(0,0,0,0.2);
        }

        .book-1 { background: #8B4513; height: 35px; }
        .book-2 { background: #CD853F; height: 28px; }
        .book-3 { background: #D2B48C; height: 32px; }
        .book-4 { background: #A0522D; height: 30px; }
        .book-5 { background: #8B4513; height: 25px; }
        .book-6 { background: #CD853F; height: 33px; }
        .book-7 { background: #D2B48C; height: 27px; }
        .book-8 { background: #A0522D; height: 31px; }

        /* Plant */
        .plant {
          bottom: 200px;
          left: 5%;
          width: 40px;
          height: 100px;
        }

        .pot {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 35px;
          height: 30px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 0 0 15px 15px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        }

        .plant-stem {
          position: absolute;
          bottom: 25px;
          left: 50%;
          width: 4px;
          height: 40px;
          background: #228B22;
          border-radius: 2px;
          transform: translateX(-50%);
        }

        .plant-leaf {
          position: absolute;
          width: 20px;
          height: 15px;
          background: #228B22;
          border-radius: 50% 10%;
          transform-origin: bottom center;
        }

        .leaf-1 {
          bottom: 50px;
          left: 5px;
          transform: rotate(-20deg);
          animation: leaf-sway 4s ease-in-out infinite;
        }

        .leaf-2 {
          bottom: 45px;
          right: 8px;
          transform: rotate(25deg);
          animation: leaf-sway 4s ease-in-out infinite reverse;
        }

        .leaf-3 {
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%) rotate(0deg);
          animation: leaf-sway 5s ease-in-out infinite;
        }

        @keyframes leaf-sway {
          0%, 100% { transform: rotate(0deg) translateX(-50%); }
          50% { transform: rotate(10deg) translateX(-50%); }
        }

        /* Sold Badges */
        .sold-badge {
          position: absolute;
          background: linear-gradient(135deg, #FF6B6B, #FF8E53);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 12px;
          text-align: center;
          box-shadow: 0 5px 20px rgba(255, 107, 107, 0.4);
          animation: badge-bounce 0.6s ease-out;
          z-index: 10;
        }

        .sold-badge .price-tag {
          font-size: 10px;
          margin-top: 2px;
          background: rgba(255,255,255,0.9);
          color: #8B4513;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .couch-sold {
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
        }

        .table-sold {
          top: -50px;
          left: 50%;
          transform: translateX(-50%);
        }

        .lamp-sold {
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
        }

        @keyframes badge-bounce {
          0% { transform: translateX(-50%) scale(0) rotate(-180deg); opacity: 0; }
          50% { transform: translateX(-50%) scale(1.2) rotate(-10deg); opacity: 1; }
          100% { transform: translateX(-50%) scale(1) rotate(0deg); opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .couch {
            width: 200px;
            height: 100px;
            left: 10%;
          }

          .coffee-table {
            width: 80px;
            height: 60px;
            left: 35%;
          }

          .floor-lamp {
            height: 180px;
            right: 20%;
          }

          .bookshelf {
            height: 150px;
            right: 2%;
          }

          .plant {
            left: 2%;
            height: 80px;
          }
        }
      `}</style>
    </div>
  )
}