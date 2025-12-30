import React from 'react';
import { Subject, ClassLevel } from '../../types';

interface SubjectGridProps {
    subjects: Subject[];
    currentClassLevel: ClassLevel | undefined;
    onSelectSubject: (subject: Subject) => void;
    classType: string;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({
    subjects,
    onSelectSubject
}) => {
    if (subjects.length === 0) {
        return <div className="text-center py-12 text-gray-400 text-sm">No subjects found.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
            {subjects.map((subject) => (
                <div
                    key={subject.id}
                    onClick={() => onSelectSubject(subject)}
                    className="
                        group cursor-pointer relative overflow-hidden
                        bg-white rounded-2xl
                        shadow-[5px_5px_10px_#d1d5db,-5px_-5px_10px_#ffffff]
                        hover:shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]
                        transform transition-all duration-300 ease-in-out
                        hover:-translate-y-1 active:scale-[0.98]
                        border border-white/50
                    "
                >
                    {/* Decorative gradient background */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-primary-50/0 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:scale-110 opacity-60"></div>

                    <div className="relative p-6 z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl shadow-inner flex items-center justify-center text-primary-600 group-hover:text-primary-700 transition-colors">
                                {/* Use first letter as icon fallback */}
                                <span className="text-xl font-black">{subject.name.charAt(0)}</span>
                            </div>
                            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded-full shadow-sm">
                                SEM {subject.semester}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-700 transition-colors mb-2 line-clamp-2 min-h-[56px]">
                            {subject.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                            <span>View Materials</span>
                            <svg className="w-3 h-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
