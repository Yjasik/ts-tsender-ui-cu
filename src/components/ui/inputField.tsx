

// Типы для пропсов
export interface InputFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  type?: string;
  large?: boolean;
  onChange: (value: string) => void;
}

export default function InputField({
  label,
  placeholder,
  value,
  type = 'text',
  large = false,
  onChange,
}: InputFieldProps) {
  // Обработчик изменения значения
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);
  };

  // Базовые классы Tailwind
  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md 
    shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
    transition-colors duration-200
  `;

  const textareaClasses = `
    ${baseClasses} 
    resize-vertical min-h-[100px]
  `;

  const inputClasses = `
    ${baseClasses}
  `;

  return (
    <div className="flex flex-col space-y-2">
      {/* Label */}
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Поле ввода или textarea */}
      {large || type === 'textarea' ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={textareaClasses}
          rows={4}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={inputClasses}
        />
      )}
    </div>
  );
}