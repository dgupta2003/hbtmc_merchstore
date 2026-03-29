import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer style={{ background: 'var(--background)', color: 'var(--hbt-orange)' }}>
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
                    {/* Column 1: Brand */}
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="relative h-12 w-12 shrink-0">
                                <Image
                                    src="/collegelogo.png"
                                    alt="HBT Logo"
                                    width={48}
                                    height={48}
                                    className="object-contain"
                                />
                            </div>
                            <span className="text-3xl leading-tight tracking-wide" style={{ color: 'var(--hbt-orange)' }}>Hinduhridaysamrat Balasaheb Thackeray<br />(HBT) Medical College</span>
                        </div>
                        <p className="text-[1.1rem] leading-relaxed mb-10" style={{ color: 'var(--hbt-orange)' }}>
                            Official products store. Wear your pride, celebrate your journey.
                        </p>
                        <div className="flex items-center gap-5">
                            <a
                                href="https://instagram.com/arunodaya_hbtmc"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Arunodaya HBT MC"
                                className="transition-opacity hover:opacity-60"
                                style={{ color: 'var(--hbt-orange)' }}
                            >
                                <Instagram size={24} />
                            </a>
                            <a
                                href="https://instagram.com/hbtmcofficial"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Official HBT MC"
                                className="transition-opacity hover:opacity-60"
                                style={{ color: 'var(--hbt-orange)' }}
                            >
                                <Instagram size={24} />
                            </a>
                            <a
                                href="mailto:hbtmcmerchstore@gmail.com"
                                className="transition-opacity hover:opacity-60"
                                style={{ color: 'var(--hbt-orange)' }}
                            >
                                <Mail size={24} />
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-2xl mb-8 tracking-wide" style={{ color: 'var(--hbt-orange)' }}>Quick Links</h3>
                        <ul className="space-y-4">
                            {[
                                { href: '/login', label: 'Student Login' },
                                { href: '/register', label: 'Register' },
                                { href: '/dashboard', label: 'Shop Products' },
                                { href: '/orders', label: 'My Orders' },
                                { href: '/cart', label: 'Cart' },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[1.1rem] hover:opacity-60 transition-opacity"
                                        style={{ color: 'var(--hbt-orange)' }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Contact */}
                    <div>
                        <h3 className="text-2xl mb-8 tracking-wide" style={{ color: 'var(--hbt-orange)' }}>Contact Us</h3>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4 text-[1.1rem]" style={{ color: 'var(--hbt-orange)' }}>
                                <MapPin size={22} className="mt-1 flex-shrink-0" style={{ color: 'var(--hbt-orange)' }} />
                                <span>
                                    H.B.T. Medical College &amp; Dr. R. N. Cooper Municipal General Hospital<br />
                                    Bhaktivedanta Swami Road, Vile Parle (W)<br />
                                    Juhu, Mumbai, 400056
                                </span>
                            </li>
                            <li className="flex items-center gap-4 text-[1.1rem]" style={{ color: 'var(--hbt-orange)' }}>
                                <Mail size={22} className="flex-shrink-0" style={{ color: 'var(--hbt-orange)' }} />
                                <a href="mailto:hbtmcmerchstore@gmail.com" className="hover:opacity-60 transition-opacity">
                                    hbtmcmerchstore@gmail.com
                                </a>
                            </li>
                            <li className="flex items-center gap-4 text-[1.1rem]" style={{ color: 'var(--hbt-orange)' }}>
                                <Instagram size={22} className="flex-shrink-0" style={{ color: 'var(--hbt-orange)' }} />
                                <a
                                    href="https://instagram.com/hbtmcofficial"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:opacity-60 transition-opacity"
                                >
                                    @hbtmcofficial
                                </a>
                            </li>
                            <li className="flex items-center gap-4 text-[1.1rem]" style={{ color: 'var(--hbt-orange)' }}>
                                <Instagram size={22} className="flex-shrink-0" style={{ color: 'var(--hbt-orange)' }} />
                                <a
                                    href="https://instagram.com/arunodaya_hbtmc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:opacity-60 transition-opacity"
                                >
                                    @arunodaya_hbtmc
                                </a>
                            </li>

                        </ul>

                        <div className="mt-8 pt-8 border-t" style={{ borderColor: 'rgba(255,70,0,0.2)' }}>
                            <p className="text-[1.05rem]" style={{ color: 'var(--hbt-orange)' }}>
                                Pickup Location: Male Common Room,<br />
                                1st Floor, Main College Building
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div
                    className="pt-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[1.05rem]"
                    style={{ borderTop: '1px solid rgba(255,70,0,0.2)', color: 'var(--hbt-orange)' }}
                >
                    <p>&copy; {year} H.B.T. Medical College. All rights reserved.</p>
                    <p className="tracking-widest uppercase text-xs">
                        Made with ❤️ for HBTMC Students by{' '}
                        <a
                            href="https://www.linkedin.com/in/devanshgupta2003/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:opacity-70 transition-opacity"
                        >
                            Gupta Ji
                        </a>.
                    </p>
                </div>
            </div>
        </footer>
    );
}
