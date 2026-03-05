import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DepartmentShellContextType {
  /** Whether a department layout is currently active (rendering dept sidebar/nav) */
  isDeptActive: boolean;
  /** Activate department mode */
  setDeptActive: (active: boolean) => void;
}

const DepartmentShellContext = createContext<DepartmentShellContextType>({
  isDeptActive: false,
  setDeptActive: () => {},
});

export function DepartmentShellProvider({ children }: { children: ReactNode }) {
  const [isDeptActive, setDeptActive] = useState(false);

  const value = useMemo(() => ({ isDeptActive, setDeptActive }), [isDeptActive]);

  return (
    <DepartmentShellContext.Provider value={value}>
      {children}
    </DepartmentShellContext.Provider>
  );
}

export function useDepartmentShell() {
  return useContext(DepartmentShellContext);
}
