import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/api';
import { registerFormSchema, type RegisterForm } from '../../features/auth/auth.schemas';

import backgroundRegister from './assets/background-register.png';
import iconUserName from './assets/icon-user-name.png';
import iconLogin from './assets/icon-login.png';
import iconCompleteManagement from './assets/icon-complete-management.png';
import iconTrustedSecurity from './assets/icon-trusted-security.png';
import iconQrCode from './assets/icon-qr-code.png';

import logoVinum from '../Login/assets/logo-vinum.png';
import iconBrand from '../Login/assets/icon-brand.png';
import iconEmail from '../Login/assets/icon-email.png';
import iconPassword from '../Login/assets/icon-password.png';

const featureItems = [
  {
    icon: iconCompleteManagement,
    title: 'GESTÃO COMPLETA',
    text: 'Gerencie vinícolas, vinhos, safras, lotes e registros com mais praticidade.',
  },
  {
    icon: iconTrustedSecurity,
    title: 'SEGURANÇA E CONFIANÇA',
    text: 'Seus dados e registros protegidos com tecnologia de ponta.',
  },
  {
    icon: iconQrCode,
    title: 'GERAÇÃO DE QR CODE',
    text: 'Gere QR Codes exclusivos para cada lote e compartilhe com segurança.',
  },
];

const inputShell = 'h-[clamp(46px,4.6vw,52px)] flex items-center gap-[10px] px-[14px] border-2 border-[#c9c5c3] rounded-[6px] bg-white transition-[border-color,box-shadow] duration-150 focus-within:border-[#7d1d2d] focus-within:shadow-[0_0_0_3px_rgb(125_29_45_/_10%)]';
const inputClass = 'w-full min-w-0 border-0 outline-0 bg-transparent text-[#261b1c] text-[clamp(11px,0.9vw,14px)] placeholder:text-[#c6c4c4]';

const registerDraftKey = 'vinum_form_draft:register';

function readRegisterDraft(): Partial<RegisterForm> {
  try {
    const value = sessionStorage.getItem(registerDraftKey);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function clearRegisterDraft() {
  try {
    sessionStorage.removeItem(registerDraftKey);
  } catch {
    /* armazenamento de rascunho indisponível não impede o uso normal do formulário */
  }
}

export default function CadastroPage({ onOpenLogin }) {
  const [message, setMessage] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: readRegisterDraft(),
  });
  const registerDraft = watch();

  useEffect(() => {
    try {
      const { password: _password, confirmPassword: _confirmPassword, ...safeDraft } = registerDraft;
      sessionStorage.setItem(registerDraftKey, JSON.stringify(safeDraft));
    } catch {
      /* limites do armazenamento não impedem o uso normal do formulário */
    }
  }, [registerDraft]);

  async function submit(data: RegisterForm) {
    setMessage('');
    try {
      await api.register({ name: data.name, email: data.email, password: data.password });
      clearRegisterDraft();
      setMessage('Conta criada com sucesso. Agora faça o login.');
      setTimeout(() => onOpenLogin?.(), 900);
    } catch (error) { setMessage(error.message); }
  }

  return (
    <main className="min-h-screen min-w-[320px] flex items-center justify-center bg-[#351416] p-[clamp(18px,3.2vw,60px)] max-[1120px]:p-6 max-[560px]:p-0">
      <section
        className="relative w-[var(--stage-width)] aspect-[1414/927] overflow-hidden rounded-r-[46px] bg-cover bg-center bg-no-repeat shadow-[0_26px_64px_rgb(22_4_5_/_28%)] max-[1120px]:w-[min(100%,920px)] max-[1120px]:aspect-auto max-[1120px]:min-h-[980px] max-[1120px]:rounded-[30px] max-[1120px]:bg-[position:36%_center] max-[1120px]:after:content-[''] max-[1120px]:after:absolute max-[1120px]:after:inset-0 max-[1120px]:after:bg-[rgb(47_10_15_/_20%)] max-[1120px]:after:pointer-events-none max-[560px]:min-h-screen max-[560px]:rounded-none"
        style={{ backgroundImage: `url(${backgroundRegister})`, '--stage-width': 'min(92vw, calc((100vh - clamp(36px, 6.4vw, 120px)) * 1.525), 1414px)' }}
        aria-label="Tela de cadastro do sistema VINUM"
      >
        <section className="absolute z-[2] left-[4.2%] top-[5.4%] w-[35.4%] h-[87.6%] flex flex-col items-stretch bg-white px-[3.2%] pt-[1.8%] pb-[2.3%] rounded-[42px] shadow-[0_18px_45px_rgb(37_6_9_/_18%)] max-[1120px]:left-1/2 max-[1120px]:top-1/2 max-[1120px]:w-[min(90%,530px)] max-[1120px]:h-auto max-[1120px]:-translate-x-1/2 max-[1120px]:-translate-y-1/2 max-[1120px]:px-[30px] max-[1120px]:pt-[34px] max-[1120px]:pb-[28px] max-[1120px]:rounded-[36px] max-[560px]:w-[calc(100%_-_28px)] max-[560px]:px-5 max-[560px]:pt-7 max-[560px]:pb-6 max-[560px]:rounded-[28px]">
          <header className="text-center mb-[2.8%]">
            <div className="flex items-center justify-center gap-[7px] mx-auto mt-0 mb-[1.9%] text-[#d6a740]" aria-hidden="true">
              <span className="w-[72px] h-px bg-[#d6a740]" />
              <i className="not-italic text-base -translate-y-px">◇</i>
              <span className="w-[72px] h-px bg-[#d6a740]" />
            </div>
            <img className="w-1/2 h-auto object-contain block mx-auto mt-0 mb-[3.1%] max-[560px]:w-[58%]" src={logoVinum} alt="VINUM — Da origem à taça" />
            <h1 className="m-0 font-playfair text-[clamp(24px,2.3vw,34px)] leading-[1.14] font-normal text-[#321b1c] max-[560px]:text-[30px]">Criar nova conta</h1>
            <p className="mt-[1.2%] mb-0 text-[clamp(12px,1.03vw,16px)] text-[#1a1a1a]">Preencha os dados abaixo para criar sua conta</p>
          </header>

          <form className="flex flex-col" onSubmit={handleSubmit(submit)}>
            <label className="block w-full mb-[2.1%]">
              <span className="block mb-[1.7%] text-[clamp(14px,1.1vw,17px)] text-[#171414]">Nome completo</span>
              <span className={inputShell}>
                <img className="w-[23px] h-[23px] object-contain shrink-0" src={iconUserName} alt="" aria-hidden="true" />
                <input className={inputClass} type="text" placeholder="Digite seu nome completo" {...register('name')} />
              </span>
            </label>

            <div className="grid grid-cols-2 gap-[10px] max-[1120px]:grid-cols-1 max-[1120px]:gap-0">
              <label className="block mb-[2.1%]">
                <span className="block mb-[1.7%] text-[clamp(14px,1.1vw,17px)] text-[#171414]">E-mail:</span>
                <span className={inputShell}>
                  <img className="w-[23px] h-[23px] object-contain shrink-0" src={iconEmail} alt="" aria-hidden="true" />
                  <input className={inputClass} type="email" placeholder="Digite seu E-mail" {...register('email')} />
                </span>
              </label>

              <label className="block mb-[2.1%]">
                <span className="block mb-[1.7%] text-[clamp(14px,1.1vw,17px)] text-[#171414]">Confirmar E-mail:</span>
                <span className={inputShell}>
                  <img className="w-[23px] h-[23px] object-contain shrink-0" src={iconEmail} alt="" aria-hidden="true" />
                  <input className={inputClass} type="email" placeholder="Confirme seu E-mail" {...register('confirmEmail')} />
                </span>
              </label>
            </div>

            <div className="mt-[0.7%] grid grid-cols-2 gap-[10px] max-[1120px]:grid-cols-1 max-[1120px]:gap-0">
              <label className="block mb-[2.1%]">
                <span className="block mb-[1.7%] text-[clamp(14px,1.1vw,17px)] text-[#171414]">Senha:</span>
                <span className={inputShell}>
                  <img className="w-[23px] h-[23px] object-contain shrink-0" src={iconPassword} alt="" aria-hidden="true" />
                  <input className={inputClass} type="password" placeholder="Digite sua senha" {...register('password')} />
                </span>
              </label>

              <label className="block mb-[2.1%]">
                <span className="block mb-[1.7%] text-[clamp(14px,1.1vw,17px)] text-[#171414]">Confirmar Senha:</span>
                <span className={inputShell}>
                  <img className="w-[23px] h-[23px] object-contain shrink-0" src={iconPassword} alt="" aria-hidden="true" />
                  <input className={inputClass} type="password" placeholder="Confirme sua senha" {...register('confirmPassword')} />
                </span>
              </label>
            </div>

            <button disabled={isSubmitting} className="w-full min-h-[clamp(50px,5.3vw,58px)] mt-[6.8%] px-[18px] py-[10px] flex items-center justify-center gap-5 border-0 rounded-[5px] bg-[#4c151c] text-[#d8b655] text-[clamp(17px,1.52vw,22px)] font-bold cursor-pointer transition-[transform,background-color] duration-150 hover:bg-[#5c1821] active:translate-y-px max-[1120px]:mt-6 disabled:opacity-60" type="submit">
              <span>Criar Conta</span>
              <span className="text-[1.35em] leading-none" aria-hidden="true">→</span>
            </button>

            {(message || Object.values(errors)[0]?.message) && <p className="mt-2 mb-0 text-[#7b2028] text-[11px] leading-[1.3] text-center">{message || String(Object.values(errors)[0]?.message ?? '')}</p>}
          </form>

          <div className="flex items-center gap-3 mt-[3.2%] mb-[3.2%]" aria-hidden="true">
            <span className="flex-1 h-px bg-[#504747]" />
            <p className="m-0 whitespace-nowrap text-[clamp(11px,0.95vw,14px)] text-[#232020]">Ja possui uma conta?</p>
            <span className="flex-1 h-px bg-[#504747]" />
          </div>

          <button className="w-full min-h-[clamp(48px,4.9vw,54px)] px-[18px] py-[9px] flex items-center justify-center gap-3 border-2 border-[#5d2228] rounded-[5px] bg-white text-[#5d2228] text-[clamp(17px,1.45vw,21px)] font-bold cursor-pointer transition-colors duration-150 hover:bg-[#fcf6f5]" type="button" onClick={onOpenLogin}>
            <span>Fazer Login</span>
            <img className="w-[22px] h-[22px] object-contain" src={iconLogin} alt="" aria-hidden="true" />
          </button>
        </section>

        <section className="absolute z-[2] left-[60.8%] right-[2.8%] top-[18.8%] bottom-[13.6%] flex flex-col items-center text-white text-center max-[1120px]:hidden" aria-label="Apresentação do cadastro">
          <img className="w-[clamp(74px,7.2vw,108px)] h-[clamp(74px,7.2vw,108px)] object-contain mb-[6%] drop-shadow-[0_5px_10px_rgb(0_0_0_/_15%)]" src={iconBrand} alt="Símbolo VINUM" />

          <div className="w-full max-w-[455px] mx-auto">
            <h2 className="m-0 font-playfair text-[48px] leading-[1.18] font-bold [text-shadow:0_2px_12px_rgb(0_0_0_/_18%)] max-[1300px]:text-[42px]">Faça Parte dessa<br />Jornada do vinho.</h2>
            <p className="mt-[4.6%] mx-auto mb-0 max-w-[430px] font-inter text-base leading-[1.35] font-bold [text-shadow:0_2px_8px_rgb(0_0_0_/_42%)] max-[1300px]:text-[15px]">Cadastre-se e tenha acesso a todas as funcionalidades da plataforma.</p>
          </div>

          <div className="w-[92%] grid grid-cols-3 gap-x-[clamp(20px,2.4vw,32px)] mt-auto items-start justify-items-center">
            {featureItems.map((feature) => (
              <article className="min-w-0" key={feature.title}>
                <img className="block w-[clamp(50px,4.4vw,64px)] h-[clamp(50px,4.4vw,64px)] mx-auto mt-0 mb-[10px] object-contain drop-shadow-[0_3px_6px_rgb(0_0_0_/_16%)]" src={feature.icon} alt="" aria-hidden="true" />
                <h3 className="mt-0 mb-[10px] text-white text-[clamp(10px,0.9vw,15px)] leading-[1.2] font-extrabold whitespace-normal">{feature.title}</h3>
                <p className="mx-auto my-0 max-w-[170px] text-white text-[clamp(9px,0.82vw,13px)] leading-[1.28] font-semibold [text-shadow:0_1px_5px_rgb(0_0_0_/_42%)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
