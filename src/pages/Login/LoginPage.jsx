import { useState } from 'react';
import { api, saveSession } from '../../api/api.js';

import backgroundLogin from './assets/background-login.png';
import logoVinum from './assets/logo-vinum.png';
import iconBrand from './assets/icon-brand.png';
import iconEmail from './assets/icon-email.png';
import iconPassword from './assets/icon-password.png';
import iconRegister from './assets/icon-register.png';
import iconOriginVerified from './assets/icon-origin-verified.png';
import iconTrustedRecord from './assets/icon-trusted-record.png';
import iconOriginToGlass from './assets/icon-origin-to-glass.png';

const featureItems = [
  {
    icon: iconOriginVerified,
    title: 'ORIGEM VERIFICADA',
    text: 'Informações sobre a vinícola e a procedência do vinho.',
  },
  {
    icon: iconTrustedRecord,
    title: 'REGISTRO CONFIÁVEL',
    text: 'Dados do lote registrados para garantir maior transparência.',
  },
  {
    icon: iconOriginToGlass,
    title: 'DA ORIGEM À TAÇA',
    text: 'Consulte a trajetória do vinho através do QR Code.',
  },
];

export default function LoginPage({ onOpenRegister, onLoginSuccess }) {
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const session = await api.login({ email: form.get('email'), password: form.get('password') });
      saveSession(session);
      onLoginSuccess?.(session.user);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen min-w-[320px] flex items-center justify-center bg-[#351416] p-[clamp(18px,3.2vw,60px)] max-[1050px]:p-6 max-[560px]:p-0">
      <section
        className="relative w-[var(--stage-width)] aspect-[1398/898] overflow-hidden rounded-r-[48px] bg-cover bg-center bg-no-repeat shadow-[0_26px_64px_rgb(22_4_5_/_28%)] max-[1050px]:w-[min(100%,900px)] max-[1050px]:aspect-auto max-[1050px]:min-h-[900px] max-[1050px]:rounded-[30px] max-[1050px]:bg-[position:36%_center] max-[1050px]:after:content-[''] max-[1050px]:after:absolute max-[1050px]:after:inset-0 max-[1050px]:after:bg-[rgb(47_10_15_/_20%)] max-[1050px]:after:pointer-events-none max-[560px]:min-h-screen max-[560px]:rounded-none"
        style={{ backgroundImage: `url(${backgroundLogin})`, '--stage-width': 'min(92vw, calc((100vh - clamp(36px, 6.4vw, 120px)) * 1.5574), 1398px)' }}
        aria-label="Tela de acesso ao sistema VINUM"
      >
        <section className="absolute z-[2] left-[4.2%] top-[9.5%] w-[33.2%] h-[83.5%] min-h-0 flex flex-col items-stretch bg-white px-[3.15%] pt-[4.2%] pb-[3.2%] rounded-[46px] shadow-[0_18px_45px_rgb(37_6_9_/_18%)] max-[1050px]:left-1/2 max-[1050px]:top-1/2 max-[1050px]:w-[min(88%,470px)] max-[1050px]:h-auto max-[1050px]:min-h-[700px] max-[1050px]:-translate-x-1/2 max-[1050px]:-translate-y-1/2 max-[1050px]:px-[42px] max-[1050px]:pt-[54px] max-[1050px]:pb-[38px] max-[1050px]:rounded-[38px] max-[560px]:w-[calc(100%_-_28px)] max-[560px]:min-h-0 max-[560px]:px-6 max-[560px]:pt-[42px] max-[560px]:pb-[30px] max-[560px]:rounded-[30px]">
          <img className="w-1/2 h-auto object-contain self-center mb-[4.1%] max-[560px]:w-[58%]" src={logoVinum} alt="VINUM — Da origem à taça" />

          <header className="text-center">
            <h1 className="m-0 font-playfair text-[clamp(23px,2vw,31px)] font-normal leading-[1.16] text-[#321b1c] max-[1050px]:text-[32px]">Bem-vindo de volta!</h1>
            <div className="flex items-center justify-center gap-[7px] mx-auto mt-[2.2%] mb-[2.9%] text-[#d6a740]" aria-hidden="true">
              <span className="w-16 h-px bg-[#d6a740]" />
              <i className="not-italic text-base -translate-y-px">◇</i>
              <span className="w-16 h-px bg-[#d6a740]" />
            </div>
            <p className="mt-0 mb-[3.8%] text-[clamp(11px,1vw,15px)] text-[#171717] max-[1050px]:text-[15px]">Acesse sua conta para continuar.</p>
          </header>

          <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
            <label className="block mb-[3.35%]">
              <span className="block mb-[1.6%] text-[clamp(12px,1vw,16px)] text-[#161313] max-[1050px]:text-[15px]">E-mail:</span>
              <span className="h-[clamp(40px,4.35vw,46px)] flex items-center gap-[10px] bg-white px-[13px] border-2 border-[#c8c4c2] rounded-[6px] transition-[border-color,box-shadow] duration-150 focus-within:border-[#7d1d2d] focus-within:shadow-[0_0_0_3px_rgb(125_29_45_/_10%)]">
                <img className="w-[25px] h-[25px] object-contain shrink-0" src={iconEmail} alt="" aria-hidden="true" />
                <input className="w-full min-w-0 border-0 outline-0 bg-transparent text-[#261b1c] text-[clamp(12px,0.98vw,15px)] placeholder:text-[#c7c4c4] max-[1050px]:text-[15px]" type="email" name="email" placeholder="Digite seu E-mail" required />
              </span>
            </label>

            <label className="block mb-[3.35%]">
              <span className="block mb-[1.6%] text-[clamp(12px,1vw,16px)] text-[#161313] max-[1050px]:text-[15px]">Senha:</span>
              <span className="h-[clamp(40px,4.35vw,46px)] flex items-center gap-[10px] bg-white px-[13px] border-2 border-[#c8c4c2] rounded-[6px] transition-[border-color,box-shadow] duration-150 focus-within:border-[#7d1d2d] focus-within:shadow-[0_0_0_3px_rgb(125_29_45_/_10%)]">
                <img className="w-[25px] h-[25px] object-contain shrink-0" src={iconPassword} alt="" aria-hidden="true" />
                <input className="w-full min-w-0 border-0 outline-0 bg-transparent text-[#261b1c] text-[clamp(12px,0.98vw,15px)] placeholder:text-[#c7c4c4] max-[1050px]:text-[15px]" type="password" name="password" placeholder="Digite sua senha" required />
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 mt-[-1.1%] mb-[5.2%] max-[560px]:items-start">
              <label className="inline-flex items-center gap-[6px] whitespace-normal text-[clamp(11px,0.95vw,14px)] max-[1050px]:text-[13px]">
                <input
                  className="w-[19px] h-[19px] m-0 accent-[#7c1e2d]"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Lembrar de mim</span>
              </label>

              <button
                className="p-0 border-0 bg-transparent text-[#a71722] underline underline-offset-2 cursor-pointer whitespace-nowrap italic font-bold text-[clamp(11px,0.95vw,14px)] max-[1050px]:text-[13px]"
                type="button"
                onClick={() => setMessage('Recuperação de senha será implementada posteriormente.')}
              >
                Esqueci minha senha
              </button>
            </div>

            <button className="w-full min-h-[clamp(48px,5.2vw,54px)] px-[18px] py-[10px] flex items-center justify-center gap-5 border-0 rounded-[5px] bg-[#4c151c] text-[#d8b655] text-[clamp(16px,1.45vw,20px)] font-bold cursor-pointer transition-[transform,background-color] duration-150 hover:bg-[#5c1821] active:translate-y-px" type="submit">
              <span>Entrar</span>
              <span className="text-[1.35em] font-normal leading-none" aria-hidden="true">→</span>
            </button>

            {message && <p className="mt-2 mb-0 text-[#7b2028] text-[11px] leading-[1.3] text-center">{message}</p>}
          </form>

          <div className="flex items-center gap-3 mt-[5.2%] mb-[5.2%]" aria-hidden="true">
            <span className="flex-1 h-px bg-[#282020]" />
            <p className="m-0 whitespace-nowrap text-[clamp(11px,0.95vw,14px)] text-[#282020] max-[1050px]:text-[13px]">Ainda não tem uma conta?</p>
            <span className="flex-1 h-px bg-[#282020]" />
          </div>

          <button
            className="w-full min-h-[clamp(46px,5vw,52px)] px-[18px] py-[9px] flex items-center justify-center gap-[13px] border-2 border-[#5d2228] rounded-[5px] bg-white text-[#5d2228] text-[clamp(16px,1.4vw,20px)] font-bold cursor-pointer transition-colors duration-150 hover:bg-[#fcf6f5]"
            type="button"
            onClick={() => {
              setMessage('');
              onOpenRegister?.();
            }}
          >
            <span>Criar conta</span>
            <img className="w-7 h-7 object-contain" src={iconRegister} alt="" aria-hidden="true" />
          </button>
        </section>

        <section className="absolute z-[2] left-[60.2%] right-[3.8%] top-[18.2%] bottom-[12.2%] flex flex-col items-center text-white text-center max-[1050px]:hidden" aria-label="Apresentação do sistema">
          <img className="w-[clamp(74px,7.2vw,106px)] h-[clamp(74px,7.2vw,106px)] object-contain mb-[4.6%] drop-shadow-[0_5px_10px_rgb(0_0_0_/_15%)]" src={iconBrand} alt="Símbolo VINUM" />

          <div className="w-full max-w-[600px] mx-auto">
            <h2 className="mx-auto my-0 font-playfair text-[48px] leading-[1.14] font-bold tracking-[-0.01em] [text-shadow:0_2px_12px_rgb(0_0_0_/_18%)] max-[1320px]:text-[42px]">Conheça a história<br />por trás de cada vinho</h2>
            <p className="font-inter mt-[4.8%] mx-auto mb-0 max-w-[600px] text-base leading-[1.35] font-bold [text-shadow:0_2px_8px_rgb(0_0_0_/_42%)] max-[1320px]:text-[15px]">
              Da origem à taça, acompanhe informações sobre o vinho, sua safra, lote e procedência
              de forma simples e transparente.
            </p>
          </div>

          <div className="w-[96%] grid grid-cols-3 gap-x-[clamp(26px,2.7vw,40px)] mt-[62px] items-start justify-items-center">
            {featureItems.map((feature) => (
              <article className="min-w-0" key={feature.title}>
                <img className="block w-[clamp(42px,3.9vw,56px)] h-[clamp(42px,3.9vw,56px)] mx-auto mt-0 mb-[10px] object-contain drop-shadow-[0_3px_6px_rgb(0_0_0_/_16%)]" src={feature.icon} alt="" aria-hidden="true" />
                <h3 className="mt-0 mb-2 text-white text-[clamp(8px,0.8vw,12px)] leading-[1.15] font-extrabold whitespace-nowrap">{feature.title}</h3>
                <p className="mx-auto my-0 max-w-[165px] text-white text-[clamp(8px,0.78vw,11px)] leading-[1.27] font-semibold [text-shadow:0_1px_5px_rgb(0_0_0_/_42%)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
