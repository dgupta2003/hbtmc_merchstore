export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div 
            className="animate-fade-in" 
            style={{ 
                animationDuration: '300ms',
                animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            {children}
        </div>
    );
}
