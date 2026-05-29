import { serve }
from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient }
from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {

  if (req.method === 'OPTIONS') {

    return new Response('ok', {

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {

    const body =
      await req.json();

    // =========================
    // SUPABASE
    // =========================

    const supabase =
      createClient(

        Deno.env.get('SUPABASE_URL')!,

        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

    // =========================
    // SCHOOL CONFIG
    // =========================

    const {
      data: school,
      error: schoolError
    } =
    await supabase

      .from('schools')

      .select('*')

      .eq(
        'id',
        body.school_id
      )

      .single();

    if (
      schoolError ||
      !school
    ) {

      throw new Error(
        'School tidak ditemukan'
      );
    }

    const BOT_TOKEN =
      school.telegram_bot_token;

    const CHAT_ID =
      school.telegram_chat_id;

    // =========================
    // WIB
    // =========================

    const waktuWIB =

      new Date()

      .toLocaleString(

        'id-ID',

        {

          timeZone:
            'Asia/Jakarta',

          dateStyle:
            'full',

          timeStyle:
            'medium'
        }
      );

    // =========================
    // MESSAGE
    // =========================

    const text = `

🚨 LAPORAN BARU TITATIF

🏫 Sekolah:
${school.nama_sekolah}

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

🕒 ${waktuWIB}

`;

    // =========================
    // TELEGRAM
    // =========================

    const telegramUrl =

      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

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
      );

    const telegramResult =
      await telegramResponse.json();

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
    );

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
    );
  }
});