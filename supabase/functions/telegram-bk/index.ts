import { serve }
from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {

  // =========================
  // CORS
  // =========================

  if (req.method === 'OPTIONS') {

    return new Response('ok', {

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {

    const body =
      await req.json()

    // =========================
    // BOT
    // =========================

    const BOT_TOKEN =
      '8900145547:AAFqMlbZYk6-pq-0eSlXkUno9m24m2APB9g'

    const CHAT_ID =
      '-5161900055'

    // =========================
    // MESSAGE
    // =========================

    const text = `

🚨 LAPORAN BARU TITATIF

👤 Siswa:
${body.nama_siswa}

🏫 Kelas:
${body.kelas}

📌 Kategori:
${body.kategori}

⚠️ Jenis:
${body.jenis}

📝 Catatan:
${body.catatan || '-'}

🕒 ${new Date().toLocaleString('id-ID')}

`

    // =========================
    // SEND TELEGRAM
    // =========================

    const telegramUrl =

`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

    const telegramResponse =
      await fetch(
        telegramUrl,
        {

          method:'POST',

          headers:{
            'Content-Type':
            'application/json'
          },

          body:JSON.stringify({

            chat_id:
              CHAT_ID,

            text:
              text
          })
        }
      )

    const telegramResult =
      await telegramResponse.json()

    // =========================
    // SUCCESS
    // =========================

    return new Response(

      JSON.stringify({

        success:true,

        telegram:
          telegramResult
      }),

      {

        headers:{

          'Content-Type':
            'application/json',

          'Access-Control-Allow-Origin':
            '*'
        },

        status:200
      }
    )

  } catch (error:any) {

    return new Response(

      JSON.stringify({

        success:false,

        error:error.message
      }),

      {

        headers:{

          'Content-Type':
            'application/json',

          'Access-Control-Allow-Origin':
            '*'
        },

        status:500
      }
    )
  }
})